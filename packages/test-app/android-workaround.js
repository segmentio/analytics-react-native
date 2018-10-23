#!/usr/bin/env node


// As of today (Oct 23) react-native is broken on Android
// We're fixing this by patching the repository order in the main gradle file of the Android project
// See:
// - https://github.com/facebook/react-native/pull/21910
// - https://github.com/facebook/react-native/issues/21907#issuecomment-432319128

const fs = require('fs')
const path = require('path')

const gradlePath = path.resolve(__dirname, 'project/android/build.gradle')

fs.writeFileSync(
    gradlePath,
    fs
        .readFileSync(gradlePath, 'utf-8')
        .replace(/google\(\)/g, '')
        .replace(/jcenter\(\)/g, 'google()\njcenter()')
)
