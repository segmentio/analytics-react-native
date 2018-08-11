require 'json'
package = JSON.parse(File.read('./package.json'))

Pod::Spec.new do |s|
  s.name                = 'RNAnalytics'
  s.version             = package['version']
  s.summary             = package['description']
  s.description         = <<-DESC
    Analytics for iOS provides a single API that lets you
    integrate with over 100s of tools.
                          DESC

  s.homepage            = 'http://segment.com/'
  s.social_media_url    = 'https://twitter.com/segment'
  s.license             = { :type => 'MIT' }
  s.author              = { 'Segment' => 'friends@segment.com' }
  s.source              = { :git => 'https://github.com/segmentio/analytics-react-native.git', :tag => s.version.to_s }

  s.platform            = :ios, '9.0'
  s.source_files        = 'ios/**/*.{m,h}'
  s.static_framework    = true

  s.dependency          'Analytics'
  s.dependency          'React'
end
