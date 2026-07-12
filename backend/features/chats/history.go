package chats

import (
	"strconv"

	"gui-onlinechat/backend/core/dto"
	"gui-onlinechat/backend/core/logger"
)

// GetChatHistory — история чата с профилями отправителей + автопометка прочтения.
func (f *Chats) GetChatHistory(chatID int64, lastMessageID *int64, limit *int) (*dto.ChatHistoryResponse, error) {
	log := logger.For("chats", "GetChatHistory")

	msgResp, err := f.GetChatMessages(chatID, lastMessageID, limit)
	if err != nil {
		return nil, err
	}

	profiles := make(map[string]*dto.GetUserResponse)
	seen := make(map[int]bool)
	for _, msg := range msgResp.Messages {
		if !seen[msg.SenderID] {
			seen[msg.SenderID] = true
			var profile *dto.GetUserResponse
			if int64(msg.SenderID) == f.core.UserID {
				profile, err = f.users.GetSelfData()
			} else {
				profile, err = f.users.GetUserData(int64(msg.SenderID))
			}
			if err == nil {
				profiles[strconv.Itoa(msg.SenderID)] = profile
			}
		}
	}

	if len(msgResp.Messages) > 0 {
		maxID := 0
		for _, msg := range msgResp.Messages {
			if msg.ID > maxID {
				maxID = msg.ID
			}
		}
		if maxID > 0 {
			_ = f.MarkMessagesAsRead(chatID, dto.MarkMessagesAsReadRequest{LastReadMessageID: maxID})
		}
	}

	log.Info("история загружена", "chatID", chatID, "messages", len(msgResp.Messages), "profiles", len(profiles))
	return &dto.ChatHistoryResponse{
		Messages: msgResp.Messages,
		Profiles: profiles,
	}, nil
}
