package chats

import (
	"fmt"
	"net/http"
)

// DeleteChatMessage — мягкое удаление сообщения (DELETE /api/v2/chats/{chat_id}/messages/{message_id}).
func (f *Chats) DeleteChatMessage(chatID, messageID int64) error {
	path := fmt.Sprintf("/api/v2/chats/%d/messages/%d", chatID, messageID)
	return f.core.DoRequest(http.MethodDelete, path, nil, nil, nil)
}
