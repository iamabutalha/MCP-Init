import {McpServer, ResourceTemplate} from "@modelcontextprotocol/sdk/server/mcp.js"
import {StdioServerTransport} from '@modelcontextprotocol/sdk/server/stdio.js'
import {z} from "zod"
import fs from "node:fs/promises"
import { CreateMessageResultSchema } from "@modelcontextprotocol/sdk/types.js"
const server = new McpServer({
    name: "test",
    version: "1.0.0",
    capabilities: {
        resources: {},
        tools: {},
        prompts: {}

    }
})

server.resource(
    "users",
    "user://all",
    {
        description: "Get all user data from database",
        title: "Users",
        mimeType: "application/json"
    }, async uri => {

        const users = await import("./data/user.json", {
            with: {type: "json"}
        }).then(m => m.default)

        return {
            contents: [{ uri: uri.href, text: JSON.stringify(users), mimeType:  "application/json"}]
        }
    }
)

server.resource("user-details", new ResourceTemplate("user://{userId}/profile", {
    list: undefined
}),   {
        description: "Get a user details from database",
        title: "Users",
        mimeType: "application/json"
    }, async (uri, {userId}) => {
        const users = await import("./data/user.json", {
            with: {type: "json"}
        }).then(m => m.default)

        const user = users.find(u => u.id === parseInt(userId))

        if(user == null) {
            return {
                contents: [
                    {
                        uri: uri.href, text: JSON.stringify({error: "User not found"}),
                        mimeType: "application/json"
                    }
                ]
            }
        }

        return {
            contents: [{ uri: uri.href, text: JSON.stringify(user), mimeType:  "application/json"}]
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

server.tool("create-random-user", "Create a random user with fake data", {
    title: "Create user",
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: true
}, async () => {
    // using my own prompt function i created
   const res = await server.server.request({
        method: "sampling/createMessage",
        params: {
            messages: [{
                role: "user",
                content: {
                    type: "text",
                    text: "Generate a fake user data. The user should have a realsitic name, email, address and phone number. Return this data as a JSON object with no other text or formater so it can be used with JSON.parse having an id also"
                }
            }],
            maxTokens: 1024
        }
    }, CreateMessageResultSchema)

    if (res.content.type !== "text") {
        return {
            content: [{type: "text", text: "Failed to generate user data"}]
        }
    }

    try {
        const fakeUser = JSON.parse(res.content.text.trim().replace(/^```json/, "").replace(/```$/, "")).trim()

        const id = await createUser(fakeUser)

        return {
            content:[{
                type: "text", text: `User ${id} created successfully`
            }]
        }
    } catch (error) {
        return {
            content: [{
                type: "text", text: "Failed to generate user data",
                error
            }]
        }
    }
})

server.prompt("generate-fake-user", "Generate a fake user based on a given name", {
    name: z.string(),

}, ({name}) => {
    return {
        messages: [{
            role: 'user',
            content: {
                type: "text", text: `Generate a fake user with the name ${name}. The user should have a relastic email, address and phone number.`
            }
        }]
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