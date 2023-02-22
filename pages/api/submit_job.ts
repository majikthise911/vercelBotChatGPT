import type { NextApiRequest, NextApiResponse } from 'next'
import { getSteamshipPackage } from '@steamship/steamship-nextjs'
import {Task} from "@steamship/client";


export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<any>
) {
  const { messages } = req.body as any;

  if (!messages) {
    return res.json({ error: "Please enter a message." })
  }

  const {message, who} = messages[messages.length - 1]

  if (!message) {
    return res.json({ error: "No last message found." })
  }

  try {
    // Fetch a stub to the Steamship-hosted backend.
    // Use a different workspace name per-user to provide data isolation.
    const uniqueUserToken = "user-1234";
    const packageHandle = process.env.STEAMSHIP_PACKAGE_HANDLE as string;
    const workspace = `${packageHandle}-${uniqueUserToken}`;

    const pkg = await getSteamshipPackage({
      workspace: workspace,
      pkg: packageHandle
    })

    // Invoke a method on the package defined in steamship/api.py. Full syntax: pkg.invoke("method", {args}, "POST" | "GET")
    // Since we use invokeAsync here, the result will be a task that we can poll. This guarantees the Vercel function
    // can return quickly without having the paid plan.
    const resp: Task<any> = await pkg.invokeAsync('send_message', {
      message: message,
      chat_history_handle: 'default' // Note: the bundled chat package provides different chat "rooms" with a workspace.
    })

    const taskId = resp.taskId;

    if (!taskId) {
      return res.json({ error: "No taskId was returned from Steamship"});
    } else {
      return res.json({taskId, workspace});
    }
  } catch (ex) {
    console.log(ex)
    const awaitedEx = (await ex) as any;

    if (awaitedEx?.response?.data?.status?.statusMessage) {
      return res.json({ error: awaitedEx?.response?.data?.status?.statusMessage })
    }

    console.log(typeof awaitedEx)
    console.log(awaitedEx)

    return res.json({ error: `There was an error responding to your message.` })
  }

}
