package chats

import (
	"fmt"
	"net/http"
	"net/url"
	"strconv"

	"gui-onlinechat/backend/core/dto"
)

// GetChatMessages — сообщения чата с пагинацией (GET /api/v2/chats/{chat_id}/messages).
func (f *Chats) GetChatMessages(chatID int64, lastMessageID *int64, limit *int) (*dto.GetChatMessagesResponse, error) {
	path := fmt.Sprintf("/api/v2/chats/%d/messages", chatID)
	query := url.Values{}
	if lastMessageID != nil {
		query.Set("last_message_id", strconv.FormatInt(*lastMessageID, 10))
	}
	if limit != nil {
		query.Set("limit", strconv.Itoa(*limit))
	}
	var resp dto.GetChatMessagesResponse
	if err := f.core.DoRequest(http.MethodGet, path, query, nil, &resp); err != nil {
		return nil, err
	}
	return &resp, nil
}
