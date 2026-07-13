package chats

import (
	"gui-onlinechat/backend/core/dto"
	"gui-onlinechat/backend/core/logger"
)

// GetChatsWithProfiles — список чатов с профилями собеседников.
func (f *Chats) GetChatsWithProfiles() (*dto.ChatsWithProfilesResponse, error) {
	log := logger.For("chats", "GetChatsWithProfiles")

	chatsResp, err := f.GetUserChats()
	if err != nil {
		return nil, err
	}

	currentUID := f.core.UserID

	result := make([]dto.ChatWithProfile, 0, len(chatsResp.Chats))
	for _, chat := range chatsResp.Chats {
		cwp := dto.ChatWithProfile{Chat: chat}

		membersResp, err := f.GetChatMembers(int64(chat.ID))
		if err == nil {
			for _, uid := range membersResp.Members {
				if int64(uid) != currentUID {
					if profile, err := f.users.GetUserData(int64(uid)); err == nil {
						cwp.Profile = profile
						break
					}
				}
			}
		}

		result = append(result, cwp)
	}

	log.Info("чаты загружены", "count", len(result))
	return &dto.ChatsWithProfilesResponse{Chats: result}, nil
}
