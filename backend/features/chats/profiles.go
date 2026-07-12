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

	result := make([]dto.ChatWithProfile, 0, len(chatsResp.Chats))
	for _, chat := range chatsResp.Chats {
		cwp := dto.ChatWithProfile{Chat: chat}
		if chat.Name != "" {
			if profile, err := f.resolveProfileByName(chat.Name); err == nil {
				cwp.Profile = profile
			}
		}
		result = append(result, cwp)
	}

	log.Info("чаты загружены", "count", len(result))
	return &dto.ChatsWithProfilesResponse{Chats: result}, nil
}

// resolveProfileByName разрешает имя чата в профиль собеседника.
func (f *Chats) resolveProfileByName(name string) (*dto.GetUserResponse, error) {
	uid, err := f.resolveUID(name)
	if err != nil {
		return nil, err
	}
	return f.users.GetUserData(uid)
}
