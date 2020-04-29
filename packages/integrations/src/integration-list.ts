import { parse } from 'yaml'
import { readFileSync } from 'fs'
import { resolve } from 'path'

export interface IntegrationDeclaration {
	name: string
	ios: {
		disabled?: boolean
		pod?: {
			name?: string
			version?: string
		}
		prefix?: string
		className?: string
		framework?: string
		framework_alt?: string
		header?: string
	}
	android: {
		disabled?: boolean
		factory?: {
			class?: string
			import?: string
		}
		maven?: {
			repo?: string
			name?: string
			version?: string
		}
	}
}

export interface Integration extends IntegrationDeclaration {
	name: string
	slug(separator?: string): string
	npm: {
		package: string
	}
}

const integrations: IntegrationDeclaration[] = parse(
	readFileSync(resolve(__dirname, '../integrations.yml'), 'utf-8')
)

export default integrations
	.map(({ name, ios = {}, android = {} }) => {
		if (ios.disabled && android.disabled) {
			return null!
		}

		const slug = (sep = '') => name.replace(/-|_| /g, sep)
		const suffix = ios.disabled ? '-android' : android.disabled ? '-ios' : ''

		return {
			name,
			slug,
			ios,
			android,
			npm: {
				package: `@segment/analytics-react-native-${slug(
					'-'
				).toLowerCase()}${suffix}`
			}
		}
	})
	.filter(integration => integration !== null)
