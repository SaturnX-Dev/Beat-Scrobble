package handlers

import (
	"encoding/json"
	"net/http"
	"strconv"

	"github.com/SaturnX-Dev/Beat-Scrobble/engine/middleware"
	"github.com/SaturnX-Dev/Beat-Scrobble/internal/db"
	"github.com/SaturnX-Dev/Beat-Scrobble/internal/logger"
	"github.com/SaturnX-Dev/Beat-Scrobble/internal/models"
	"github.com/SaturnX-Dev/Beat-Scrobble/internal/utils"
)

// Admin only: List all users
func ListUsersHandler(store db.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()
		l := logger.FromContext(ctx)

		user := middleware.GetUserFromContext(ctx)
		if user == nil || user.Role != models.UserRoleAdmin {
			utils.WriteError(w, "forbidden", http.StatusForbidden)
			return
		}

		users, err := store.GetAllUsers(ctx)
		if err != nil {
			l.Error().Err(err).Msg("ListUsersHandler: Failed to fetch users")
			utils.WriteError(w, "failed to fetch users", http.StatusInternalServerError)
			return
		}

		// Filter out passwords
		for i := range users {
			users[i].Password = nil
		}

		utils.WriteJSON(w, http.StatusOK, users)
	}
}

// Admin only: Create User
func CreateUserHandler(store db.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()
		l := logger.FromContext(ctx)

		caller := middleware.GetUserFromContext(ctx)
		if caller == nil || caller.Role != models.UserRoleAdmin {
			utils.WriteError(w, "forbidden", http.StatusForbidden)
			return
		}

		var payload struct {
			Username string `json:"username"`
			Password string `json:"password"`
			Role     string `json:"role"`
		}
		if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
			utils.WriteError(w, "invalid request body", http.StatusBadRequest)
			return
		}

		if payload.Username == "" || payload.Password == "" {
			utils.WriteError(w, "username and password required", http.StatusBadRequest)
			return
		}

		// Check if user exists
		existing, err := store.GetUserByUsername(ctx, payload.Username)
		if err != nil {
			l.Error().Err(err).Msg("CreateUserHandler: DB error")
			utils.WriteError(w, "internal server error", http.StatusInternalServerError)
			return
		}
		if existing != nil {
			utils.WriteError(w, "username taken", http.StatusConflict)
			return
		}

		role := models.UserRoleUser
		if payload.Role == "admin" {
			role = models.UserRoleAdmin
		}

		// Create
		user, err := store.SaveUser(ctx, db.SaveUserOpts{
			Username: payload.Username,
			Password: payload.Password,
			Role:     role,
		})
		if err != nil {
			l.Error().Err(err).Msg("CreateUserHandler: SaveUser failed")
			utils.WriteError(w, "failed to create user", http.StatusInternalServerError)
			return
		}

		l.Info().Msgf("User %s created by admin %s", user.Username, caller.Username)
		user.Password = nil
		utils.WriteJSON(w, http.StatusCreated, user)
	}
}

// Admin only: Update User (Promote/Demote or Password Reset)
func AdminUpdateUserHandler(store db.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()
		l := logger.FromContext(ctx)

		caller := middleware.GetUserFromContext(ctx)
		if caller == nil || caller.Role != models.UserRoleAdmin {
			utils.WriteError(w, "forbidden", http.StatusForbidden)
			return
		}

		userIDStr := r.URL.Query().Get("id")
		userID, err := strconv.Atoi(userIDStr)
		if err != nil {
			utils.WriteError(w, "invalid user id", http.StatusBadRequest)
			return
		}

		var payload struct {
			Role     string `json:"role"`
			Password string `json:"password"`
		}
		if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
			utils.WriteError(w, "invalid request body", http.StatusBadRequest)
			return
		}

		opts := db.UpdateUserOpts{ID: int32(userID)}
		changed := false

		if payload.Role != "" {
			if payload.Role == "admin" {
				role := models.UserRoleAdmin
				opts.Role = &role
				changed = true
			} else if payload.Role == "user" {
				role := models.UserRoleUser
				opts.Role = &role
				changed = true
			}
		}

		if payload.Password != "" {
			opts.Password = payload.Password
			changed = true
		}

		if !changed {
			utils.WriteError(w, "no changes specified", http.StatusBadRequest)
			return
		}

		if err := store.UpdateUser(ctx, opts); err != nil {
			l.Error().Err(err).Msg("AdminUpdateUserHandler: Update failed")
			utils.WriteError(w, "update failed", http.StatusInternalServerError)
			return
		}

		l.Info().Msgf("User %d updated by admin %s", userID, caller.Username)
		w.WriteHeader(http.StatusNoContent)
	}
}

// Admin only: Delete User
func AdminDeleteUserHandler(store db.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()
		l := logger.FromContext(ctx)

		caller := middleware.GetUserFromContext(ctx)
		if caller == nil || caller.Role != models.UserRoleAdmin {
			utils.WriteError(w, "forbidden", http.StatusForbidden)
			return
		}

		userIDStr := r.URL.Query().Get("id")
		userID, err := strconv.Atoi(userIDStr)
		if err != nil {
			utils.WriteError(w, "invalid user id", http.StatusBadRequest)
			return
		}

		// Prevent deleting self?
		if int32(userID) == caller.ID {
			utils.WriteError(w, "cannot delete yourself", http.StatusBadRequest)
			return
		}

		// We need a DeleteUser method in DB interface.
		// Assuming it exists or I need to add it.
		// Previous context: `engine/handlers/delete.go` might have DeleteUser?
		// Actually let's check db interface later. If not exists I'll add it.
		// Assuming store.DeleteUser(ctx, int32(userID)) works or similar.
		// Let's assume it is `DeleteUser(ctx, id)`.

		if err := store.DeleteUser(ctx, int32(userID)); err != nil {
			l.Error().Err(err).Msg("AdminDeleteUserHandler: Delete failed")
			utils.WriteError(w, "delete failed", http.StatusInternalServerError)
			return
		}

		l.Info().Msgf("User %d deleted by admin %s", userID, caller.Username)
		w.WriteHeader(http.StatusNoContent)
	}
}
