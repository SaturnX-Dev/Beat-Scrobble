package handlers

import (
	"sync"
	"time"
)

// GlobalNotificationManager handles user notifications from background processes
type GlobalNotificationManager struct {
	mu            sync.RWMutex
	notifications map[int32][]Notification // UserID -> Notifications
}

type Notification struct {
	ID        string      `json:"id"`
	Type      string      `json:"type"` // success, error, info
	Message   string      `json:"message"`
	Timestamp time.Time   `json:"timestamp"`
	Data      interface{} `json:"data,omitempty"`
}

var (
	NotificationManager = &GlobalNotificationManager{
		notifications: make(map[int32][]Notification),
	}
)

func (nm *GlobalNotificationManager) Add(userID int32, n Notification) {
	nm.mu.Lock()
	defer nm.mu.Unlock()
	n.Timestamp = time.Now()
	nm.notifications[userID] = append(nm.notifications[userID], n)
}

func (nm *GlobalNotificationManager) GetAndClear(userID int32) []Notification {
	nm.mu.Lock()
	defer nm.mu.Unlock()
	notifs := nm.notifications[userID]
	delete(nm.notifications, userID)
	return notifs
}
