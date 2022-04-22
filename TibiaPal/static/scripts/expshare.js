function submit_form() {
    level = document.getElementById("level").value
    content = document.getElementById("expresults")
    content.innerHTML = "";
    lower_range = Math.round(level/1.5)
    upper_range = Math.round(level*1.5)
    content.innerHTML = content.innerHTML + "A character with level <b>" + level +"</b> can share experience with levels <b>" + lower_range + "</b> to <b>" + upper_range +"</b><br>"
}