import fs from 'fs-extra'
import path from 'path'
import mustache from 'mustache'
import pkg from '../../core/package.json'

import integrations, { Integration } from './integration-list'

interface Context extends Integration {
	nativeModule: string
	out: string
	template: (template: string, view: {}, dest?: string) => Promise<void>
}

const root = path.resolve(__dirname, '..')

const safeWrite = async (file: string, contents: string) => {
	await fs.mkdirp(path.dirname(file))
	await fs.writeFile(file, contents)
}

async function prepareAndroid({
	template,
	name,
	android,
	nativeModule,
	slug
}: Context) {
	const identifier = slug('.').toLowerCase()
	const {
		maven: {
			repo = undefined,
			name: depName = `com.segment.analytics.android.integrations:${slug(
				'-'
			).toLowerCase()}`,
			version = '+@aar'
		} = {},
		factory: { class: factoryClass = `${slug()}Integration` } = {}
	} = android
	const {
		import: factoryImport = `com.segment.analytics.android.integrations.${identifier}.${factoryClass}`
	} = android.factory || {}
	const classpath = `com.segment.analytics.reactnative.integration.${identifier}`
	const dependency = `${depName}:${version}`
	const root = 'android/src/main'

	await Promise.all([
		template('android/build.gradle', { dependency, maven: repo }),

		template(`${root}/AndroidManifest.xml`, { classpath }),

		...['Module', 'Package'].map(name =>
			template(
				`${root}/java/com/segment/analytics/reactnative/integration/${name}.kt`,
				{ nativeModule, classpath, factoryClass, factoryImport },
				`${root}/java/${classpath.replace(/\./g, '/')}/Integration${name}.kt`
			)
		)
	])
}

async function prepareiOS({
	template,
	name,
	out,
	ios,
	nativeModule,
	slug
}: Context) {
	const xcodeProject = 'ios/RNAnalyticsIntegration.xcodeproj'
	const targetXcodeProject = `ios/${nativeModule}.xcodeproj`
	const pod_name = `RNAnalyticsIntegration-${slug('-')}`
	const framework_name = `Segment_${slug()}`
	const {
		pod: {
			name: pod_dependency = `Segment-${slug()}`,
			version: pod_version = undefined
		} = {},
		prefix = 'SEG'
	} = ios
	const classSlug = `${prefix}${slug()}IntegrationFactory`
	const {
		className = classSlug,
		framework = framework_name,
		header = classSlug
	} = ios

	await Promise.all([
		fs.copy(
			path.resolve(root, 'template', xcodeProject, 'project.xcworkspace'),
			path.resolve(out, targetXcodeProject, 'project.xcworkspace')
		),
		template(
			`${xcodeProject}/project.pbxproj`,
			{
				project_name: nativeModule
			},
			`${targetXcodeProject}/project.pbxproj`
		),
		template(
			'Pod.podspec',
			{
				name,
				pod_name,
				pod_version,
				pod_dependency
			},
			`${pod_name}.podspec`
		),
		template('ios/main.m', {
			integration_class_name: nativeModule,
			factory_header: `<${framework}/${header}.h>`,
			factory_class_name: className
		})
	])
}

async function prepareJs({
	name,
	npm,
	nativeModule,
	out,
	template,
	ios,
	android,
	slug
}: Context) {
	await Promise.all([
		safeWrite(
			path.resolve(out, 'package.json'),
			JSON.stringify(
				{
					name: npm.package,
					main: 'index.js',
					version: pkg.version,
					license: pkg.license,
					description: `${name} Integration for Segment's React-Native analytics library.`
				},
				null,
				2
			)
		),
		template('index.js', {
			nativeModule,
			name,
			disable_ios: String(ios.disabled || false),
			disable_android: String(android.disabled || false)
		}),
		template('index.d.ts.tpl', { slug: slug() }, 'index.d.ts')
	])
}

function genIntegration({ name, ios, android, npm, slug }: Integration) {
	const out = path.resolve(root, 'build', npm.package)
	const nativeModule = `RNAnalyticsIntegration_${slug('_')}`
	const ctx: Context = {
		name,
		out,
		nativeModule,
		npm,
		ios,
		android,
		slug,
		template: async (template, view, dest = template) =>
			await safeWrite(
				path.resolve(out, dest),
				mustache.render(
					await fs.readFile(path.resolve(root, 'template', template), 'utf-8'),
					view
				)
			)
	}

	const tasks = [prepareJs(ctx)]

	if (!ios.disabled) {
		tasks.push(prepareiOS(ctx))
	}
	if (!android.disabled) {
		tasks.push(prepareAndroid(ctx))
	}

	return Promise.all(tasks)
}

Promise.all(integrations.map(genIntegration)).catch(err => {
	console.error(err)
	process.exit(2)
})
