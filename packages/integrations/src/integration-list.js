const { parse } = require('yaml').default
const { readFileSync } = require('fs')
const { resolve } = require('path')

module.exports = parse(
	readFileSync(resolve(__dirname, '../integrations.yml'), 'utf-8')
)
	.map(({ name, ios = {}, android = {} }) => {
		if (ios.disabled && android.disabled) {
			return null
		}

		const slug = (sep = '') => name.replace(/-|_| /g, sep)
		const suffix = ios.disabled ? '-android' : android.disabled ? '-ios' : ''

		return {
			name,
			slug,
			ios,
			android,
			npm: {
				package: `@segment/react-native-${slug('-').toLowerCase()}${suffix}`
			}
		}
	})
	.filter(integration => integration !== null)
