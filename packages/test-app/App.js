import React, { Component } from 'react'
import { StyleSheet, Text, View, Image, TouchableOpacity } from 'react-native'
import analytics from '@segment/react-native'

const calls = require('./calls.json')

const Button = ({ title, onPress }) => (
	<TouchableOpacity style={styles.button} onPress={onPress}>
		<Text style={styles.text}>{title}</Text>
	</TouchableOpacity>
)

const screenHome = () => analytics.screen('Home')

const flush = () => analytics.flush()

const pizzaEaten = () => analytics.track('Pizza Eaten')

const trackOrder = () =>
	analytics
		.track('Order Completed')
		.track('Order Cancelled', {
			order_id: 323
		})
		.identify('userIdOnly')
		.identify('userId', {
			age: 32
		})
		.alias('newlyAliasedId')
		.screen('User Login Screen', {
			method: 'google'
		})

let buildId = null
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
					style={styles.logo}
				/>
				<Button title="Screen: Home" onPress={screenHome} />
				<Button title="Track: Order Complete" onPress={trackOrder} />
				<Button title="Flush" onPress={flush} />
				<Button title="Track: Pizza Eaten" onPress={pizzaEaten} />
				<Button title="Launch test suite" onPress={testSuite} />
			</View>
		)
	}
}

const styles = StyleSheet.create({
	logo: {
		height: 150,
		margin: 50,
		width: 240,
		height: 160
	},
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
