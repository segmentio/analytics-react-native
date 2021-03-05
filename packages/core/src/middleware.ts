import { Context, Integrations, JsonMap, Options } from './bridge'
import { assertNever } from './utils'
import { NativeWrapper } from './wrapper'

export interface MiddlewarePayload<T extends string, D extends {}> {
	type: T
	data: D
	context: Context
	next(context?: Partial<Context>): void
	// tslint:disable-next-line:unified-signatures
	next(context?: Partial<Context>, data?: D): void
}

export interface TrackPayload
	extends MiddlewarePayload<
		'track',
		{
			event: string
			properties: JsonMap
			integrations: Integrations
		}
	> {}

export interface ScreenPayload
	extends MiddlewarePayload<
		'screen',
		{
			name: string
			properties: JsonMap
			integrations: Integrations
		}
	> {}

export interface IdentifyPayload
	extends MiddlewarePayload<
		'identify',
		{
			user: string | null
			traits: JsonMap | null
			options: JsonMap
			integrations: Integrations
		}
	> {}

export interface GroupPayload
	extends MiddlewarePayload<
		'group',
		{
			groupId: string
			traits: JsonMap
			integrations: Integrations
		}
	> {}

export interface AliasPayload
	extends MiddlewarePayload<
		'alias',
		{
			newId: string
			integrations: Integrations
		}
	> {}

export type Payload =
	| TrackPayload
	| IdentifyPayload
	| ScreenPayload
	| GroupPayload
	| AliasPayload

export type Middleware = (payload: Payload) => void | Promise<void>
export type PayloadFromType<T> = Extract<Payload, { type: T }>

export class MiddlewareChain {
	private readonly middlewares: Middleware[] = []

	constructor(private readonly wrapper: NativeWrapper<any>) {}

	public add(middleware: Middleware) {
		this.middlewares.push(middleware)
	}

	public async run<T extends Payload['type'], P extends PayloadFromType<T>>(
		type: T,
		data: P['data'],
		context: JsonMap
	) {
		const ctx: Context = {
			...context,
			library: {
				name: 'analytics-react-native',
				version: require('../package.json').version
			}
		}

		const payload: Payload = await this.exec(type, ctx, data)

		switch (payload.type) {
			case 'alias':
				return this.wrapper.run('alias', alias =>
					alias(payload.data.newId, payload.data.integrations, payload.context)
				)
			case 'group':
				return this.wrapper.run('group', group =>
					group(
						payload.data.groupId,
						payload.data.traits,
						payload.data.integrations,
						payload.context
					)
				)
			case 'identify':
				return this.wrapper.run('identify', identify =>
					identify(
						payload.data.user,
						payload.data.traits,
						payload.data.options,
						payload.data.integrations,
						payload.context
					)
				)
			case 'screen':
				return this.wrapper.run('screen', screen =>
					screen(
						payload.data.name,
						payload.data.properties,
						payload.data.integrations,
						payload.context
					)
				)
			case 'track':
				return this.wrapper.run('track', track =>
					track(
						payload.data.event,
						payload.data.properties,
						payload.data.integrations,
						payload.context
					)
				)
			default:
				return assertNever(payload)
		}
	}

	private async exec<T extends Payload['type'], P extends PayloadFromType<T>>(
		type: T,
		ctx: Context,
		data: P['data'],
		index = 0
	): Promise<P> {
		const { middlewares } = this
		const middleware = middlewares[index]

		if (index >= middlewares.length || !middleware) {
			return makePayload(type, ctx, data)
		}

		let called = false

		return new Promise<P>((resolve, reject) =>
			Promise.resolve(
				middleware.call(
					middleware,
					makePayload(type, ctx, data, (nextCtx = ctx, nextProps = data) => {
						if (called) {
							throw new Error(
								'middleware.payload.next() can only be called one time'
							)
						}

						const finalCtx = {
							...ctx,
							...nextCtx
						}

						called = true
						this.exec(type, finalCtx, nextProps, index + 1)
							.then(resolve)
							.catch(reject)
					})
				)
			).catch(reject)
		)
	}
}

const notImplemented = (name: string) => () => {
	throw new Error(`.${name}() not implemented`)
}

const makePayload = <T extends Payload['type'], P extends PayloadFromType<T>>(
	type: T,
	context: Context,
	data: P['data'],
	next: (ctx?: Context, data?: P['data']) => void = notImplemented('next')
) =>
	({
		context,
		data,
		next,
		type
	} as P)
