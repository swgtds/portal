package main

import (
	"encoding/json"
	"fmt"
	"log"
	"math/rand"
	"net/http"
	"os"
	"sync"
	"time"

	"github.com/gorilla/websocket"
	"github.com/joho/godotenv"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		// Allow connections from any origin for cloud deployments
		return true
	},
	ReadBufferSize:    1024,
	WriteBufferSize:   1024,
	HandshakeTimeout:  45 * time.Second, // Longer timeout for cloud
	EnableCompression: true,             // Enable compression for better performance over internet
}

type Client struct {
	conn     *websocket.Conn
	lastPing time.Time
}

type Room struct {
	clients    map[*Client]bool
	content    string
	lastActive time.Time
	lock       sync.Mutex
}

type Message struct {
	Type    string `json:"type"`
	Content string `json:"content,omitempty"`
	Sender  string `json:"sender,omitempty"`
}

var rooms = make(map[string]*Room)
var roomsLock sync.Mutex

func generateRoomCode() string {
	rand.Seed(time.Now().UnixNano())
	return fmt.Sprintf("%06d", rand.Intn(1000000))
}

func handleCreateRoom(w http.ResponseWriter, r *http.Request) {
	roomID := generateRoomCode()

	roomsLock.Lock()
	rooms[roomID] = &Room{
		clients:    make(map[*Client]bool),
		lastActive: time.Now(),
	}
	roomsLock.Unlock()

	log.Printf("Room %s created", roomID)

	resp := map[string]string{"roomID": roomID}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resp)
}

func handleRoomExists(w http.ResponseWriter, r *http.Request) {
	roomID := r.URL.Query().Get("room")
	if roomID == "" {
		http.Error(w, "Missing room ID", http.StatusBadRequest)
		return
	}

	roomsLock.Lock()
	_, exists := rooms[roomID]
	roomsLock.Unlock()

	resp := map[string]bool{"exists": exists}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resp)
}

func handleHealth(w http.ResponseWriter, r *http.Request) {
	roomsLock.Lock()
	roomCount := len(rooms)
	roomsLock.Unlock()

	resp := map[string]interface{}{
		"status":    "healthy",
		"timestamp": time.Now().Unix(),
		"rooms":     roomCount,
		"uptime":    time.Since(time.Now().Add(-time.Hour)).String(), // Placeholder for actual uptime
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resp)
}

func handleWebSocket(w http.ResponseWriter, r *http.Request) {
	roomID := r.URL.Query().Get("room")
	if roomID == "" {
		http.Error(w, "Missing room ID", http.StatusBadRequest)
		return
	}

	roomsLock.Lock()
	room, exists := rooms[roomID]
	roomsLock.Unlock()

	if !exists {
		http.Error(w, "Room does not exist", http.StatusNotFound)
		return
	}

	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Println("WebSocket upgrade error:", err)
		return
	}

	room.lock.Lock()
	if room.content != "" {
		msg := Message{Type: "text_update", Content: room.content}
		msgBytes, _ := json.Marshal(msg)
		if err := conn.WriteMessage(websocket.TextMessage, msgBytes); err != nil {
			log.Println("Failed to send initial content to client:", err)
		}
	}
	client := &Client{
		conn:     conn,
		lastPing: time.Now(),
	}
	room.clients[client] = true
	room.lastActive = time.Now()
	room.lock.Unlock()

	log.Printf("Client joined room: %s", roomID)

	// Set connection timeouts (more aggressive for cloud)
	conn.SetReadDeadline(time.Now().Add(90 * time.Second))  // 90 seconds read timeout
	conn.SetWriteDeadline(time.Now().Add(30 * time.Second)) // 30 seconds write timeout

	conn.SetPongHandler(func(string) error {
		conn.SetReadDeadline(time.Now().Add(90 * time.Second))
		log.Println("Received pong from client")
		return nil
	})

	// Start ping routine (more frequent for cloud deployments)
	go func() {
		ticker := time.NewTicker(30 * time.Second)
		defer ticker.Stop()
		for {
			select {
			case <-ticker.C:
				conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
				if err := conn.WriteMessage(websocket.PingMessage, nil); err != nil {
					log.Printf("Ping failed: %v", err)
					return
				}
				log.Println("Sent ping to client")
			}
		}
	}()

	go func() {
		defer func() {
			room.lock.Lock()
			delete(room.clients, client)
			room.lock.Unlock()
			conn.Close()

			roomsLock.Lock()
			if len(room.clients) == 0 {
				log.Printf("Room %s has no users (will auto-expire after 1 hour)", roomID)
			}
			roomsLock.Unlock()
		}()

		for {
			conn.SetReadDeadline(time.Now().Add(90 * time.Second))
			_, msgBytes, err := conn.ReadMessage()
			if err != nil {
				if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure, websocket.CloseNormalClosure) {
					log.Printf("WebSocket unexpected close error: %v", err)
				} else {
					log.Printf("WebSocket read error: %v", err)
				}
				break
			}

			var msg Message
			if err := json.Unmarshal(msgBytes, &msg); err != nil {
				log.Printf("Error unmarshaling message: %v", err)
				continue
			}

			switch msg.Type {
			case "ping":
				// Respond with pong
				pongMsg := Message{Type: "pong"}
				pongBytes, _ := json.Marshal(pongMsg)
				conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
				if err := conn.WriteMessage(websocket.TextMessage, pongBytes); err != nil {
					log.Printf("Error sending pong: %v", err)
				} else {
					log.Println("Sent pong response")
				}
				client.lastPing = time.Now()
			case "text_update":
				room.lock.Lock()
				room.content = msg.Content
				room.lastActive = time.Now()
				room.lock.Unlock()
				broadcastToRoom(roomID, msgBytes)
			case "chat_message":
				// Relay to all clients in the room (don't persist)
				room.lock.Lock()
				room.lastActive = time.Now()
				room.lock.Unlock()
				broadcastToRoom(roomID, msgBytes)
			}
		}
	}()
}

func broadcastToRoom(roomID string, msg []byte) {
	roomsLock.Lock()
	room, exists := rooms[roomID]
	roomsLock.Unlock()
	if !exists {
		return
	}

	room.lock.Lock()
	defer room.lock.Unlock()

	// Create a list of clients to remove if write fails
	var toRemove []*Client

	for client := range room.clients {
		client.conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
		err := client.conn.WriteMessage(websocket.TextMessage, msg)
		if err != nil {
			log.Printf("Write error to client: %v", err)
			client.conn.Close()
			toRemove = append(toRemove, client)
		}
	}

	// Remove failed clients
	for _, client := range toRemove {
		delete(room.clients, client)
	}
}

func startRoomCleanup() {
	ticker := time.NewTicker(1 * time.Minute)
	go func() {
		for range ticker.C {
			now := time.Now()
			roomsLock.Lock()
			for id, room := range rooms {
				room.lock.Lock()
				if len(room.clients) == 0 && now.Sub(room.lastActive) > time.Hour {
					delete(rooms, id)
					log.Printf("Deleted room %s after 1h of inactivity", id)
				}
				room.lock.Unlock()
			}
			roomsLock.Unlock()
		}
	}()
}

func withCORS(h http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		// Enhanced CORS headers for cloud deployments
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With")
		w.Header().Set("Access-Control-Allow-Credentials", "false")

		// Add headers for WebSocket upgrades
		w.Header().Set("Upgrade", "websocket")
		w.Header().Set("Connection", "Upgrade")

		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusOK)
			return
		}
		h(w, r)
	}
}

func main() {
	http.HandleFunc("/create", withCORS(handleCreateRoom))
	http.HandleFunc("/exists", withCORS(handleRoomExists))
	http.HandleFunc("/health", withCORS(handleHealth))
	http.HandleFunc("/ws", handleWebSocket) // Don't wrap WebSocket with CORS as it handles its own headers

	startRoomCleanup()

	err := godotenv.Load()
	if err != nil {
		log.Println("Error loading .env file")
	}

	port := os.Getenv("PORT")
	if port == "" {
		port = "5000" // Changed default from 5001 to 5000
	}

	log.Printf("Backend running on port %s", port)
	log.Printf("Health check available at /health")
	log.Fatal(http.ListenAndServe("0.0.0.0:"+port, nil))
}
