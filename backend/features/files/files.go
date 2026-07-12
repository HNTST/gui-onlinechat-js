package files

import (
	"gui-onlinechat/backend/core/httpclient"
)

// Files инкапсулирует загрузку и скачивание аватаров.
type Files struct {
	core *httpclient.BaseApp
}

// New создаёт Files.
func New(core *httpclient.BaseApp) *Files {
	return &Files{core: core}
}
