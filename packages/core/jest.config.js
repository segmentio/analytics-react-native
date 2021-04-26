const { defaults: tsjPreset } = require('ts-jest/presets')

module.exports = {
	presets: [
		['@babel/preset-env', { targets: { node: 'current' } }],
		'@babel/preset-typescript'
	],
	...tsjPreset,
	preset: 'react-native',
	transform: {
		...tsjPreset.transform,
		'\\.js$': '<rootDir>/node_modules/react-native/jest/preprocessor.js'
	},
	globals: {
		'ts-jest': {
			babelConfig: true
		}
	},
	cacheDirectory: '.jest/cache'
}
