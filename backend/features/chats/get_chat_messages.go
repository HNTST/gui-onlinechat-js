package chats

import (
	"fmt"
	"net/url"
	"strconv"

	"gui-onlinechat/backend/core/dto"
	"gui-onlinechat/backend/core/errs"
	"gui-onlinechat/backend/core/logger"
)

// GetChatMessages — сообщения чата с пагинацией (GET /api/v2/chats/{chat_id}/messages).
func (f *Chats) GetChatMessages(chatID int64, lastMessageID *int64, limit *int) (*dto.GetChatMessagesResponse, error) {
	log := logger.For("chats", "GetChatMessages")

	path := fmt.Sprintf("/api/v2/chats/%d/messages", chatID)
	query := url.Values{}
	if lastMessageID != nil {
		query.Set("last_message_id", strconv.FormatInt(*lastMessageID, 10))
	}
	if limit != nil {
		query.Set("limit", strconv.Itoa(*limit))
	}
	var resp dto.GetChatMessagesResponse
	if err := f.core.DoRequest("GET", path, query, nil, &resp); err != nil {
		log.Error("ошибка получения сообщений", err, "chatID", chatID)
		return nil, errs.Wrapf(errs.CodeHTTP, "chats.GetChatMessages", err, "не удалось получить сообщения чата %d", chatID)
	}
	return &resp, nil
}
