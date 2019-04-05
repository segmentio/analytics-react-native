import React, { Component } from 'react'
import { StyleSheet, Text, View, Image, TouchableOpacity } from 'react-native'
import analytics from '@segment/analytics-react-native'

type Call = ['identify' | 'track', string, {}]

const calls: Call[] = require('./calls.json')

const Button = ({ title, onPress }: { title: string; onPress: () => void }) => (
  <TouchableOpacity style={styles.button} onPress={onPress}>
    <Text style={styles.text}>{title}</Text>
  </TouchableOpacity>
)

const screenHome = () => analytics.screen('Home')

const flush = () => analytics.flush()

const pizzaEaten = () => analytics.track('Pizza Eaten')

const trackOrder = () => {
  analytics.track('Order Completed')
  analytics.track('Order Cancelled', {
    order_id: 323
  })
  analytics.identify('userIdOnly')
  analytics.identify('userId', {
    age: 32
  })
  analytics.alias('newlyAliasedId')
  analytics.screen('User Login Screen', {
    method: 'google'
  })
}

const logAnonymousId = async () => {
  console.log('anonymousId: %s', await analytics.getAnonymousId())
}

const buildId = 'CIRCLE_WORKFLOW_ID'

const testSuite = () =>
  calls.forEach(([call, name, props = {}]) =>
    analytics[call](name, {
      ...props,
      buildId
    })
  )

export default class App extends Component {
  render() {
    return (
      <View style={styles.container}>
        <Image
          source={{ uri: 'https://i.imgur.com/GrCdId0.png' }}
          resizeMode="contain"
          style={{
            margin: 50,
            width: 240,
            height: 160
          }}
        />
        <Button title="Screen: Home" onPress={screenHome} />
        <Button title="Track: Order Complete" onPress={trackOrder} />
        <Button title="Flush" onPress={flush} />
        <Button title="Track: Pizza Eaten" onPress={pizzaEaten} />
        <Button title="Launch test suite" onPress={testSuite} />
        <Button title="Log anonymousId" onPress={logAnonymousId} />
      </View>
    )
  }
}

const styles = StyleSheet.create({
  button: {
    margin: 20
  },
  text: {
    color: '#FBFAF9'
  },
  container: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'center',
    backgroundColor: '#32A75D'
  }
})

import integrations from './integrations.gen'

analytics
    .setup('SEGMENT_WRITE_TOKEN', {
      debug: true,
      using: integrations
    })
    .then(() => console.log('Analytics ready'))
    .catch(err => console.error(err))
