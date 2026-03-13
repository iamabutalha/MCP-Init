import {McpServer} from "@modelcontextprotocol/sdk/server/mcp.js"
import {StdioServerTransport} from '@modelcontextprotocol/sdk/server/stdio.js'
import {z} from "zod"
import fs from "node:fs/promises"
const server = new McpServer({
    name: "test",
    version: "1.0.0",
    capabilities: {
        resources: {},
        tools: {},
        prompts: {}

    }
})

server.tool('create-user', "create a new user in the database", {
    name: z.string(),
    email: z.string(),
    address: z.string(),
    phone: z.string()
}, 
// annotation section make it understandable for AI (can work withou this but this is important to not make mistake by AI)
{
    title: "Create user",
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: true 
}, async (params) => {
     try {

        const id = await createUser(params) 

          return {
            content: [
                {type: "text", text: `User ${id} have successfuly created`}
            ]
        }
        
     } catch  {
        return {
            content: [
                {type: "text", text: "fAILED TO SAVE USER"}
            ]
        }
     }

})

async function createUser(user) {
    const users = await import("./data/user.json", {
        with: {type: "json"}
    }).then(m => m.default)

    const id = users.length + 1
    users.push({id, ...user})

    await fs.writeFile("./data/user.json", JSON.stringify(users, null, 2))

    return id
}


async function main() {
    const transport = new StdioServerTransport()
    await server.connect(transport)

}

main()