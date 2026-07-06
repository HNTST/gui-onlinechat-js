export namespace main {
	
	export class AddUserToChatRequest {
	    users_ids: number[];
	
	    static createFrom(source: any = {}) {
	        return new AddUserToChatRequest(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.users_ids = source["users_ids"];
	    }
	}
	export class AddUserToChatResponse {
	    chat_id: number;
	    users_ids: number[];
	
	    static createFrom(source: any = {}) {
	        return new AddUserToChatResponse(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.chat_id = source["chat_id"];
	        this.users_ids = source["users_ids"];
	    }
	}
	export class LastMessageDTO {
	    id: number;
	    text: string;
	    sender_id: number;
	    sent_at: string;
	    is_read: boolean;
	
	    static createFrom(source: any = {}) {
	        return new LastMessageDTO(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.text = source["text"];
	        this.sender_id = source["sender_id"];
	        this.sent_at = source["sent_at"];
	        this.is_read = source["is_read"];
	    }
	}
	export class ChatExtendedDTO {
	    id: number;
	    name: string;
	    unread_count: number;
	    last_message?: LastMessageDTO;
	
	    static createFrom(source: any = {}) {
	        return new ChatExtendedDTO(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.name = source["name"];
	        this.unread_count = source["unread_count"];
	        this.last_message = this.convertValues(source["last_message"], LastMessageDTO);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class EditMessageRequest {
	    text: string;
	
	    static createFrom(source: any = {}) {
	        return new EditMessageRequest(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.text = source["text"];
	    }
	}
	export class GetChatMembersResponse {
	    members: number[];
	
	    static createFrom(source: any = {}) {
	        return new GetChatMembersResponse(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.members = source["members"];
	    }
	}
	export class MessageDTO {
	    id: number;
	    message: string;
	    sender_id: number;
	    sent_at: string;
	    is_read: boolean;
	    is_edited: boolean;
	    is_deleted: boolean;
	
	    static createFrom(source: any = {}) {
	        return new MessageDTO(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.message = source["message"];
	        this.sender_id = source["sender_id"];
	        this.sent_at = source["sent_at"];
	        this.is_read = source["is_read"];
	        this.is_edited = source["is_edited"];
	        this.is_deleted = source["is_deleted"];
	    }
	}
	export class GetChatMessagesResponse {
	    messages: MessageDTO[];
	
	    static createFrom(source: any = {}) {
	        return new GetChatMessagesResponse(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.messages = this.convertValues(source["messages"], MessageDTO);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class GetUserChatsExtendedResponse {
	    chats: ChatExtendedDTO[];
	
	    static createFrom(source: any = {}) {
	        return new GetUserChatsExtendedResponse(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.chats = this.convertValues(source["chats"], ChatExtendedDTO);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class GetUserIDResponse {
	    user_id: number;
	
	    static createFrom(source: any = {}) {
	        return new GetUserIDResponse(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.user_id = source["user_id"];
	    }
	}
	export class GetUserResponse {
	    id: number;
	    username: string;
	    avatar_id: number;
	    reg: string;
	
	    static createFrom(source: any = {}) {
	        return new GetUserResponse(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.username = source["username"];
	        this.avatar_id = source["avatar_id"];
	        this.reg = source["reg"];
	    }
	}
	
	export class MarkMessagesAsReadRequest {
	    last_read_message_id: number;
	
	    static createFrom(source: any = {}) {
	        return new MarkMessagesAsReadRequest(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.last_read_message_id = source["last_read_message_id"];
	    }
	}
	
	export class SaveChatRequest {
	    author: number;
	    chat_name: string;
	    target_user: number;
	
	    static createFrom(source: any = {}) {
	        return new SaveChatRequest(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.author = source["author"];
	        this.chat_name = source["chat_name"];
	        this.target_user = source["target_user"];
	    }
	}
	export class SaveChatResponse {
	    chat_id: number;
	
	    static createFrom(source: any = {}) {
	        return new SaveChatResponse(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.chat_id = source["chat_id"];
	    }
	}
	export class SaveMessageRequest {
	    message: string;
	    sender_id: number;
	    chat_id: number;
	
	    static createFrom(source: any = {}) {
	        return new SaveMessageRequest(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.message = source["message"];
	        this.sender_id = source["sender_id"];
	        this.chat_id = source["chat_id"];
	    }
	}
	export class SaveUserRequest {
	    username: string;
	    password?: string;
	
	    static createFrom(source: any = {}) {
	        return new SaveUserRequest(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.username = source["username"];
	        this.password = source["password"];
	    }
	}
	export class SaveUserResponse {
	    id: number;
	    username: string;
	    avatar_id: number;
	    reg: string;
	
	    static createFrom(source: any = {}) {
	        return new SaveUserResponse(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.username = source["username"];
	        this.avatar_id = source["avatar_id"];
	        this.reg = source["reg"];
	    }
	}
	export class UploadAvatarResponse {
	    file_id: number;
	
	    static createFrom(source: any = {}) {
	        return new UploadAvatarResponse(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.file_id = source["file_id"];
	    }
	}

}

