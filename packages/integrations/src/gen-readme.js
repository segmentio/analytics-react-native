const mdtable = require('markdown-table')
const fs = require('fs')
const path = require('path')

const integrations = require('./integration-list')

const YES = ':white_check_mark:'
const NO = ':x:'

const table = mdtable([
	['Name', 'iOS', 'Android', 'npm package'],
	...integrations
		.sort((a, b) => a.name.localeCompare(b.name))
		.map(({ name, npm, android, ios }) => [
			`[${name}](https://www.npmjs.com/package/${npm.package})`,
			ios.disabled ? NO : YES,
			android.disabled ? NO : YES,
			'`' + npm.package + '`'
		])
])

const readme = path.resolve(__dirname, '../../../README.md')

fs.writeFileSync(
	readme,
	fs
		.readFileSync(readme, 'utf-8')
		.replace(
			/<!-- AUTOGEN:INTEGRATIONS:BEGIN -->(.*)<!-- AUTOGEN:INTEGRATIONS:END -->/s,
			`<!-- AUTOGEN:INTEGRATIONS:BEGIN -->\n${table}\n<!-- AUTOGEN:INTEGRATIONS:END -->`
		)
)
