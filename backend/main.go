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
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true
	},
}

type Room struct {
	clients    map[*websocket.Conn]bool
	content    string
	lastActive time.Time
	lock       sync.Mutex
}

var rooms = make(map[string]*Room)
var roomsLock sync.Mutex

// Generates a random 6-digit room code
func generateRoomCode() string {
	rand.Seed(time.Now().UnixNano())
	return fmt.Sprintf("%06d", rand.Intn(1000000))
}

func handleCreateRoom(w http.ResponseWriter, r *http.Request) {
	roomID := generateRoomCode()

	roomsLock.Lock()
	rooms[roomID] = &Room{
		clients:    make(map[*websocket.Conn]bool),
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
		if err := conn.WriteMessage(websocket.TextMessage, []byte(room.content)); err != nil {
			log.Println("Failed to send initial content to client:", err)
		}
	}
	room.clients[conn] = true
	room.lastActive = time.Now()
	room.lock.Unlock()

	log.Printf("Client joined room: %s", roomID)

	go func() {
		defer func() {
			room.lock.Lock()
			delete(room.clients, conn)
			room.lock.Unlock()
			conn.Close()

			roomsLock.Lock()
			if len(room.clients) == 0 {
				log.Printf("Room %s has no users (will auto-expire after 1 hour)", roomID)
			}
			roomsLock.Unlock()
		}()

		for {
			_, msg, err := conn.ReadMessage()
			if err != nil {
				break
			}
			room.lock.Lock()
			room.content = string(msg)
			room.lastActive = time.Now()
			room.lock.Unlock()

			broadcastToRoom(roomID, msg)
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

	for client := range room.clients {
		err := client.WriteMessage(websocket.TextMessage, msg)
		if err != nil {
			client.Close()
			delete(room.clients, client)
		}
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

func main() {
	http.HandleFunc("/create", handleCreateRoom)
	http.HandleFunc("/exists", handleRoomExists)
	http.HandleFunc("/ws", handleWebSocket)

	startRoomCleanup()

	port := os.Getenv("PORT")
	if port == "" {
		port = "5000" // default for local dev
	}

	log.Printf("Backend running on port %s", port)
	log.Fatal(http.ListenAndServe(":"+port, nil))
}
