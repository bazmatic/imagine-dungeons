


docker stop imagine_dungeons
docker rm imagine_dungeons
docker build -t imagine_dungeons_db .
docker run -d --name imagine_dungeons -p 5432:5432 imagine_dungeons_db

## TODO
[ ] Implement <agent> arrives.
[X] Save the actual function calls and arguments to the database, and use them to generate the text displayed to the user so that it is appropriate for their perspective.
[X] Any command can optionally update the mood, intent and description of an agent
[X] After running a command, decide if any game objects should be updated, eg the mood or intent of an agent, the description of a location or item, etc.
[X] After running a command that affects an agent, activate the agent's autonomy

[ ] Make a single tool action to update mood, intent and description together.
[X] Other people in the same location also get to hear speech and see other's actions
[ ] Items can have special functions, so the Fire Map can indicate a safe direction
[X] When an agent is defeated, they should be removed from the game
[X] When agent is attacked, display some text about the attack
[ ] Support using weapons with the attack tool
[ ] Support armour
[ ] Defence should be a calculated value based on armour and other attributes
[ ] Add intelligence to agents. Agents with low intelligence cannot speak or pick up items. 

[ ] If an agent tries to leave a location, ask the other agents if they want to try to stop them.
[ ] Add a "knowledge" property for agents, so they can learn things during their turns
[ ] Edit location page to allow an admin to maintain the location.
[ ] If the player dies, don't allow them to do anything.
[ ] Prevent an agent from attempting to leave
[ ] Use an item
