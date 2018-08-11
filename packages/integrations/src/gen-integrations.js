const fs = require('fs-extra')
const path = require('path')
const mustache = require('mustache')
const pkg = require('../package.json')

const root = path.resolve(__dirname, '..')
const integrations = require('./integration-list')

const safeWrite = async (file, contents) => {
    await fs.mkdirp(path.dirname(file))
    await fs.writeFile(file, contents)
}

function prepareAndroid({template, name, android, nativeModule, slug}) {
    const identifier = slug('.').toLowerCase()
    const {
        maven: {
            repo,
            name: depName = `com.segment.analytics.android.integrations:${slug('-').toLowerCase()}`,
            version = '+@aar'
        } = {},
        factory: {
            class: factoryClass = `${slug()}Integration`,
            import: factoryImport = `com.segment.analytics.android.integrations.${identifier}.${factoryClass}`
        } = {}
    } = android
    const classpath = `com.segment.analytics.reactnative.integration.${identifier}`
    const dependency = `${depName}:${version}`
    const root = 'android/src/main'

    return Promise.all([
        template(
            'android/build.gradle',
            {dependency, maven: repo}
        ),

        template(
            `${root}/AndroidManifest.xml`,
            {classpath}
        ),

        ...['Module', 'Package'].map(name =>
            template(
                `${root}/java/com/segment/analytics/reactnative/integration/${name}.kt`,
                {nativeModule, classpath, factoryClass, factoryImport},
                `${root}/java/${classpath.replace(/\./g, '/')}/Integration${name}.kt`
            )
        )
    ])
}

function prepareiOS({template, name, out, ios, nativeModule, slug}) {
    const xcodeProject = 'ios/RNAnalyticsIntegration.xcodeproj'
    const targetXcodeProject = `ios/${nativeModule}.xcodeproj`
    const pod_name = `RNAnalyticsIntegration-${slug('-')}`
    const {
        pod: {
            name: pod_dependency = `Segment-${slug()}`,
            version: pod_version
        } = {},
        prefix = 'SEG',
        className = `${prefix}${slug()}IntegrationFactory`,
        framework = pod_dependency,
        header = className
    } = ios

    return Promise.all([
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
                pod_dependency,
            },
            `${pod_name}.podspec`
        ),
        template(
            'ios/main.m',
            {
                integration_class_name: nativeModule,
                factory_header: `<${framework}/${header}.h>`,
                factory_class_name: className
            }
        )
    ])
}

function prepareJs({name, npm, nativeModule, out, template, ios, android}) {
    return Promise.all([
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
        template(
            'index.js',
            {
                nativeModule,
                disable_ios: String(ios.disabled || false),
                disable_android: String(android.disabled || false)
            }
        )
    ])
}

function genIntegration({name, ios, android, npm, slug}) {
    const out = path.resolve(root, 'build', npm.package)
    const nativeModule = `RNAnalyticsIntegration_${slug('_')}`
    const template = async (template, view, dest = template) => safeWrite(
        path.resolve(out, dest),
        mustache.render(
            await fs.readFile(path.resolve(root, 'template', template), 'utf-8'),
            view
        )
    )
    const ctx = {
        name, out, nativeModule, npm, template, ios, android, slug
    }

    const tasks = [prepareJs(ctx)]

    if(!ios.disabled) {
        tasks.push(prepareiOS(ctx))
    }
    if(!android.disabled) {
        tasks.push(prepareAndroid(ctx))
    }

    return Promise.all(tasks)
}

Promise
    .all(integrations.map(genIntegration))
    .catch(err => {
        console.error(err)
        process.exit(2)
    })
