import {
    Login as GoLogin,
    Register as GoRegister,
    Logout as GoLogout,
    GetChatsWithProfiles as GoGetChatsWithProfiles,
    GetChatHistory as GoGetChatHistory,
    FindOrCreateChat as GoFindOrCreateChat,
    GetUserData as GoGetUserData,
    GetSelfData as GoGetSelfData,
    GetChatMembers as GoGetChatMembers,
    SendChatMessage as GoSendChatMessage,
    EditChatMessage as GoEditChatMessage,
    DeleteChatMessage as GoDeleteChatMessage,
    GetAvatarBase64 as GoGetAvatarBase64,
} from "../../wailsjs/go/main/App";

export const AuthAPI = {
    login: GoLogin,
    register: GoRegister,
    logout: GoLogout,
};

export const ChatAPI = {
    getChatsWithProfiles: GoGetChatsWithProfiles,
    getChatHistory: GoGetChatHistory,
    findOrCreateChat: GoFindOrCreateChat,
    getChatMembers: GoGetChatMembers,
    sendMessage: GoSendChatMessage,
    editMessage: GoEditChatMessage,
    deleteMessage: GoDeleteChatMessage,
};

export const UserAPI = {
    getUserData: GoGetUserData,
    getSelfData: GoGetSelfData,
    getAvatarBase64: GoGetAvatarBase64,
};
