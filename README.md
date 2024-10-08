


docker stop imagine_dungeons
docker rm imagine_dungeons
docker build -t imagine_dungeons_db .
docker run -d --name imagine_dungeons -p 5432:5432 imagine_dungeons_db

## TODO
[] Any command can optionally update the mood, intent and description of an agent
[] After running a command, decide if any game objects should be updated, eg the mood or intent of an agent, the description of a location or item, etc.
[] After running a command that affects an agent, activate the agent's autonomy
[] Add a "knowledge" property for agents, so they can learn things during their turns
[] Make a single tool action to update mood, intent and description together.


