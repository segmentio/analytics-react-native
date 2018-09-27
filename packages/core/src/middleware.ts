import { JsonMap, NativeWrapper } from './bridge'
import bridge from './__mocks__/bridge'
import { assertNever } from './utils'

export interface TrackPayload {
	type: 'track'
	event: string
	props: JsonMap
}

export interface IdentifyPayload {
	type: 'identify'
	user: string
	props: JsonMap
}

export interface ScreenPayload {
	type: 'screen'
	name: string
	props: JsonMap
}

export interface GroupPayload {
	type: 'group'
	groupId: string
	props: JsonMap
}

export interface AliasPayload {
	type: 'alias'
	newId: string
}

export type ExcludeProperties<T, P> = { [K in Exclude<keyof T, P>]: T[K] }
export type PayloadData<P> = ExcludeProperties<P, 'type' | 'next'>

export type MiddlewarePayload<T> = T & {
	next(next: PayloadData<T>): void
}

export type Payload =
	| MiddlewarePayload<TrackPayload>
	| MiddlewarePayload<IdentifyPayload>
	| MiddlewarePayload<ScreenPayload>
	| MiddlewarePayload<GroupPayload>
	| MiddlewarePayload<AliasPayload>

export type Middleware = (payload: Payload) => void | Promise<void>

export class MiddlewareChain {
	private readonly middlewares: Middleware[] = []

	constructor(private readonly wrapper: NativeWrapper<any>) {}

	public add(middleware: Middleware) {
		this.middlewares.push(middleware)
	}

	public async run<
		T extends Payload['type'],
		P extends Extract<Payload, { type: T }>
	>(type: T, data: PayloadData<P>) {
		const payload: Payload = {
			...((await this.exec<T, P>(type, data)) as {}),
			type
		} as any

		switch (payload.type) {
			case 'alias':
				return this.wrapper.run('alias', alias => alias(payload.newId))
			case 'group':
				return this.wrapper.run('group', group =>
					group(payload.groupId, payload.props)
				)
			case 'identify':
				return this.wrapper.run('identify', identify =>
					identify(payload.user, payload.props)
				)
			case 'screen':
				return this.wrapper.run('screen', screen =>
					screen(payload.name, payload.props)
				)
			case 'track':
				return this.wrapper.run('track', track =>
					track(payload.event, payload.props)
				)
			default:
				return assertNever(payload)
		}
	}

	private async exec<
		T extends Payload['type'],
		P extends Extract<Payload, { type: T }>
	>(type: T, data: PayloadData<P>, index = 0): Promise<typeof data> {
		const { middlewares } = this
		const middleware = middlewares[index]

		if (index >= middlewares.length || !middleware) {
			return data
		}

		return new Promise<any>((resolve, reject) =>
			Promise.resolve(
				middleware.call(middleware, {
					...(data as {}),
					next: (nextProps: any) =>
						this.exec(
							type,
							{
								...(data as any),
								...nextProps
							},
							index + 1
						)
							.then(resolve)
							.catch(reject),
					type
				})
			).catch(reject)
		)
	}
}
