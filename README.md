# TibiaLootSplit
Link:
https://tibialootsplit.com/

An application for game 'Tibia', to allow you to quickly and easily split loot after a teamhunt. 
All you need to do is 'Copy to clipboard' your 'Party Hunt' analyser, paste the log and press 'Submit'. The results with corresponding bank transfer messages as well as the overall profit will be displayed.

Technical background on how the tool uses the log to build the output (pseudocode):
1. Look for the overall hunt balance
2. Count the number of players
3. Work out the final resulting balance per player using 1. and 2.
4. Find individiual balances (waste/profit) of each player
5. Use a nested loop to work out how much of each players profit/waste needs to be deducted (if they profited more than the amount obtained in 3.) or how much they need to receive (if they profited less than the amount obtained in 3.). 
For example, if player 1's balance after teamhunt is +400k, but the value obtained in 3 is +300k (i.e. 300k profit per person) then in this point we work out that player 1 needs to send 100k of their loot to another player. 
If player 2 in the above scenario had an overall balance of -50k, then we work out that he needs to receive 350k from another player (to end up with the 300k profit per person)
6. Based on the values obtained above for each player, run a loop to work out the most efficient order for which players should send money (and how much) to which other players
7. Build the final HTML output




