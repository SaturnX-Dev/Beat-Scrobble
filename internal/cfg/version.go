package cfg

func Version() string {
	lock.RLock()
	defer lock.RUnlock()
	return globalConfig.version
}
