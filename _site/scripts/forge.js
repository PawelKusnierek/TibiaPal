var item_classification
var current_tier
var target_tier
var target_price
var feeder_price
var exalted_price
var sliver_price

function submit_forge_form() {
  read_form_values()
  var verified = verify_entered_values()
  if (verified == false) {
    return
  }
}

function read_form_values() {
  item_classification = document.getElementById("classification").value
  current_tier = document.getElementById("current_tier").value
  target_tier = document.getElementById("target_tier").value
  target_price = document.getElementById("main_item_price").value
  feeder_price = document.getElementById("feeder_item_price").value
  exalted_price = document.getElementById("exalted_core_price").value
  sliver_price = document.getElementById("sliver_price").value
}

function verify_entered_values() {
  if (current_tier >= target_tier) {
    window.alert("Current tier must be lower than Target tier.");
    return false
  }
  if (item_classification == 3 && (current_tier > 3 || target_tier > 3)) {
    window.alert("Current tier/Target tier cannot be greater than 3 for Item Classification 3.");
    return false
  }
  if (item_classification == 2 && (current_tier > 2 || target_tier > 2)) {
    window.alert("Current tier/Target tier cannot be greater than 2 for Item Classification 2.");
    return false
  }
  if (item_classification == 1 && (current_tier > 1 || target_tier > 1)) {
    window.alert("Current tier/Target tier cannot be greater than 1 for Item Classification 1.");
    return false
  }
  if (target_price == '') {
    window.alert("Please enter Target item price.");
    return false
  }
  if (feeder_price == '') {
    window.alert("Please enter Feeder item price.");
    return false
  }
  if (exalted_price == '') {
    window.alert("Please enter Exalted Core price.");
    return false
  }
  if (sliver_price == '') {
    window.alert("Please enter Sliver price.");
    return false
  }
  return true
}