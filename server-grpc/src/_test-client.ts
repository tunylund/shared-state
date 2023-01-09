import grpc, { waitForChannelReady } from 'nice-grpc'
import { SharedStateServiceDefinition } from './shared-state';

const channel = grpc.createChannel('localhost:8080');
await waitForChannelReady(channel, new Date(Date.now() + 1000))

const client = grpc.createClient(
  SharedStateServiceDefinition,
  channel,
)

const id = await client.connect({})
console.log('id', id)

async function l() {
  for await (const response of client.listen({})) {
    console.log(response)
  }
}
l()
console.log('listening')

await client.send({ action: "foo", attrs: "[]" })
