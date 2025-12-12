function formatNumber(value) {
    if (value >= 10000 && value < 1000000) {
        // Between 10k and 1M: divide by 1000, round to integer, and add "k"
        return Math.round(value / 1000) + "k";
    } else if (value >= 1000000) {
        // Over 1M: round to nearest 100k, then format as "X.Xkk" (always show 1 decimal)
        var rounded = Math.round(value / 100000) * 100000;
        var millions = rounded / 1000000;
        // Always format to 1 decimal place to show hundreds of thousands
        return millions.toFixed(1) + "kk";
    } else {
        // Less than 10k: return as is
        return value.toString();
    }
}

function submit_weekly_task() {
    level = document.getElementById("level").value;
    content = document.getElementById("weekly_task_results");
    content.innerHTML = "";

    // Validate input: must be an integer between 1 and 3499
    levelNum = parseInt(level, 10);

    if (isNaN(levelNum) || levelNum < 1 || levelNum > 3499 || levelNum.toString() !== level.trim()) {
        content.innerHTML = "<p class='orange'><b>Invalid value!</b> Please enter a level between 1 and 3499.</p>";
        return;
    }

    // Get experience value for this level (level 1 = index 0, level 2 = index 1, etc.)
    var expValue = experience[levelNum - 1];
    var percentageValue = percentages[levelNum - 1];
    
    if (typeof expValue === 'undefined') {
        content.innerHTML = "<p class='orange'><b>Error!</b> Experience data not found for level " + levelNum + ".</p>";
        return;
    }

    // Apply caps for Kills values based on difficulty
    var beginnerKills = Math.min(expValue, 200000);
    var adeptKills = Math.min(expValue, 800000);
    var expertKills = Math.min(expValue, 3000000);
    var masterKills = expValue; // No cap for Master

    // Format values for display
    var beginnerKillsFormatted = formatNumber(beginnerKills);
    var adeptKillsFormatted = formatNumber(adeptKills);
    var expertKillsFormatted = formatNumber(expertKills);
    var masterKillsFormatted = formatNumber(masterKills);
    var deliveriesFormatted = formatNumber(expValue); // Deliveries use full value
    var maxExpFormatted = formatNumber(expValue);

    // Add "(cap)" suffix if values are capped
    if (expValue > 200000) {
        beginnerKillsFormatted += " (cap)";
    }
    if (expValue > 800000) {
        adeptKillsFormatted += " (cap)";
    }
    if (expValue > 3000000) {
        expertKillsFormatted += " (cap)";
    }
    // Master is never capped, so no need to check

    // Generate message and table with weekly task information
    var messageHTML = "<p>Level " + levelNum + " receives <b>" + expValue.toLocaleString() + "</b> (" + percentageValue.toFixed(2) + "% of level) experience per delivery task. <br><br>Kill task rewards depend on difficulty:</p>";
    var tableHTML = "<table class='weekly_task_table'>";
    tableHTML += "<tr><th>Difficulty</th><th>Kill Tasks</th></tr>";
    tableHTML += "<tr><td>Beginner</td><td>" + beginnerKillsFormatted + "</td></tr>";
    tableHTML += "<tr><td>Adept</td><td>" + adeptKillsFormatted + "</td></tr>";
    tableHTML += "<tr><td>Expert</td><td>" + expertKillsFormatted + "</td></tr>";
    tableHTML += "<tr><td>Master</td><td>" + masterKillsFormatted + "</td></tr>";
    tableHTML += "</table>";

    content.innerHTML = messageHTML + tableHTML;
}