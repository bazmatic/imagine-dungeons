


docker stop imagine_dungeons
docker rm imagine_dungeons
docker build -t imagine_dungeons_db .
docker run -d --name imagine_dungeons -p 5432:5432 imagine_dungeons_db

## TODO
[ ] Save the actual function calls and arguments to the database, and use them to generate the text displayed to the user so that it is appropriate for their perspective.
[ ] Any command can optionally update the mood, intent and description of an agent
[ ] After running a command, decide if any game objects should be updated, eg the mood or intent of an agent, the description of a location or item, etc.
[ ] After running a command that affects an agent, activate the agent's autonomy
[ ] Add a "knowledge" property for agents, so they can learn things during their turns
[ ] Make a single tool action to update mood, intent and description together.
[ ] Other people in the same location also get to hear speech and see other's actions
[ ] Items can have special functions, so the Fire Map can indicate a safe direction


