const forceRequire = (): typeof import('../bridge') => {
	jest.resetModules()

	return jest.requireActual('../bridge')
}

it('should throw an error if the core native module is not linked', () => {
	jest.setMock('react-native', {
		NativeModules: {}
	})

	expect(forceRequire).toThrow(/Failed to load Analytics native module./)
})

it('should export the core native module', () => {
	const RNAnalytics = {}

	jest.setMock('react-native', {
		NativeModules: { RNAnalytics }
	})

	expect(forceRequire().default).toBe(RNAnalytics)
})
