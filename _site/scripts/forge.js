var item_classification
var target_tier
var target_price
var feeder_price
var exalted_price
var sliver_price

var fusion_cost = {
  1: {
    1: 25000
  },
  2: {
    1: 750000,
    2: 5000000
  },
  3: {
    1: 4000000,
    2: 10000000,
    3: 20000000
  },
  4: {
    1: 8000000,
    2: 20000000,
    3: 40000000,
    4: 65000000,
    5: 100000000,
    6: 250000000,
    7: 750000000,
    8: 2500000000,
    9: 8000000000,
    10: 15000000000,
  },
}

// Tier limits based on classification
var tier_limits = {
  1: 1,
  2: 2,
  3: 3,
  4: 10
}

// Initialize form when page loads
document.addEventListener('DOMContentLoaded', function() {
  initialize_forge_form()
})

// Initialize the forge form
function initialize_forge_form() {
  const classificationSelect = document.getElementById('classification')
  const targetTierSelect = document.getElementById('target_tier')
  
  // Add event listener for classification changes
  classificationSelect.addEventListener('change', function() {
    update_target_tier_options()
  })
  
  // Initialize target tier as disabled
  update_target_tier_options()
}

// Update target tier options based on selected classification
function update_target_tier_options() {
  const classificationSelect = document.getElementById('classification')
  const targetTierSelect = document.getElementById('target_tier')
  const selectedClassification = classificationSelect.value
  
  // Clear existing options
  targetTierSelect.innerHTML = ''
  
  if (!selectedClassification || selectedClassification === '') {
    // No classification selected - disable tier select
    targetTierSelect.disabled = true
    const placeholderOption = document.createElement('option')
    placeholderOption.value = ''
    placeholderOption.textContent = '--'
    targetTierSelect.appendChild(placeholderOption)
  } else {
    // Classification selected - enable tier select and populate options
    targetTierSelect.disabled = false
    const maxTier = tier_limits[selectedClassification]
    
    // Add placeholder option
    const placeholderOption = document.createElement('option')
    placeholderOption.value = ''
    placeholderOption.textContent = '--'
    targetTierSelect.appendChild(placeholderOption)
    
    // Add tier options up to the maximum allowed
    for (let i = 1; i <= maxTier; i++) {
      const option = document.createElement('option')
      option.value = i
      option.textContent = i
      targetTierSelect.appendChild(option)
    }
  }
}

function submit_forge_form() {
  read_form_values()
  var verified = verify_entered_values()
  if (verified == false) {
    // Clear results if verification fails
    clear_forge_results()
    return
  }
  calculate_fusion()
  calculate_transfer()
  if (item_classification == 4) {
    calculate_convergence_fusion()
    calculate_convergence_transfer()
  }
  else {
    pass
  }
}

function read_form_values() {
  item_classification = document.getElementById("classification").value
  target_tier = document.getElementById("target_tier").value
  target_price = document.getElementById("main_item_price").value
  feeder_price = document.getElementById("feeder_item_price").value
  exalted_price = document.getElementById("exalted_core_price").value
  const sliverInput = document.getElementById("sliver_price")
  sliver_price = sliverInput ? sliverInput.value : ''
}

function verify_entered_values() {
  var missingFields = []
  
  // Check each required field
  if (!item_classification || item_classification === '') {
    missingFields.push("Item Classification")
  }
  if (!target_tier || target_tier === '') {
    missingFields.push("Target Tier")
  }
  if (!target_price || target_price === '') {
    missingFields.push("Target Item Price")
  }
  if (!feeder_price || feeder_price === '') {
    missingFields.push("Feeder Item Price")
  }
  if (!exalted_price || exalted_price === '') {
    missingFields.push("Exalted Core Price")
  }
  // Check for sliver_price only if the field exists
  const sliverInput = document.getElementById("sliver_price")
  if (sliverInput && (!sliver_price || sliver_price === '')) {
    missingFields.push("Sliver Price")
  }
  
  // If any fields are missing, show a single warning with all missing fields
  if (missingFields.length > 0) {
    var message = "Please fill in all required fields before calculations can take place.\n\nMissing fields:\n"
    missingFields.forEach(function(field) {
      message += "• " + field + "\n"
    })
    window.alert(message)
    return false
  }
  
  // Convert to numbers for comparison
  item_classification = parseInt(item_classification)
  target_tier = parseInt(target_tier)
  
  // Verify tier is within limits (shouldn't happen with UI restrictions, but double-check)
  const maxTier = tier_limits[item_classification]
  if (target_tier > maxTier) {
    window.alert("Tier cannot be greater than " + maxTier + " for Item Classification " + item_classification + ".");
    return false
  }
  
  return true
}

// Format large numbers for display (convert to kk/k format)
function format_gold(amount) {
  if (amount === 0) return '0'
  if (amount >= 1000000) {
    // Convert to kk (millions)
    var kk = amount / 1000000
    if (kk >= 1000) {
      // For very large numbers, show with 2 decimal places
      return kk.toFixed(2) + ' kk'
    } else {
      // For smaller kk values, show with 1 decimal place
      return kk.toFixed(1) + ' kk'
    }
  } else if (amount >= 1000) {
    // Convert to k (thousands)
    var k = amount / 1000
    return k.toFixed(1) + ' k'
  } else {
    return Math.round(amount).toLocaleString()
  }
}

// Format number with commas
function format_number(num) {
  if (num === 0) return '0'
  if (num < 1000) {
    return Math.round(num).toString()
  }
  // For larger numbers, show with 1-2 decimal places
  if (num < 1000000) {
    return num.toFixed(1).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  } else {
    return num.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  }
}

// Format decimal number with 2 decimal places (for items consumed, exalted cores, etc.)
function format_decimal(num) {
  if (num === 0) return '0.00'
  return num.toFixed(2)
}

// Clear forge results
function clear_forge_results() {
  var resultsDiv = document.getElementById('forge_results')
  if (resultsDiv) {
    resultsDiv.innerHTML = ''
  }
}

// Display Regular Fusion results
function display_fusion_results(results) {
  var resultsDiv = document.getElementById('forge_results')
  if (!resultsDiv) {
    console.error('Results div not found')
    return
  }
  
  // Clear previous results
  resultsDiv.innerHTML = ''
  
  // Validate results
  if (!results || typeof results.totalCost !== 'number' || isNaN(results.totalCost)) {
    var errorMsg = document.createElement('div')
    errorMsg.style.color = '#ff6b6b'
    errorMsg.style.padding = '10px'
    errorMsg.textContent = 'Error calculating fusion results. Please check your inputs.'
    resultsDiv.appendChild(errorMsg)
    return
  }
  
  // Create results container
  var container = document.createElement('div')
  container.style.marginTop = '20px'
  container.style.padding = '20px'
  container.style.backgroundColor = '#061021'
  container.style.border = '1px solid #2d8cf8b6'
  container.style.borderRadius = '4px'
  
  // Title
  var title = document.createElement('h2')
  title.textContent = 'Expected Regular Fusion Results'
  title.style.color = '#ebebeb'
  title.style.marginTop = '0'
  title.style.marginBottom = '20px'
  container.appendChild(title)
  
  // Create results table
  var table = document.createElement('table')
  table.style.width = '100%'
  table.style.borderCollapse = 'collapse'
  table.style.color = '#ebebeb'
  
  // Helper function to create a table row
  function createRow(label, value, isTotal) {
    var row = document.createElement('tr')
    if (isTotal) {
      row.style.borderTop = '2px solid #2d8cf8b6'
      row.style.fontWeight = 'bold'
    }
    
    var labelCell = document.createElement('td')
    labelCell.textContent = label
    labelCell.style.padding = '10px'
    labelCell.style.textAlign = 'left'
    if (isTotal) {
      labelCell.style.color = '#2d8cf8'
    }
    
    var valueCell = document.createElement('td')
    valueCell.textContent = value
    valueCell.style.padding = '10px'
    valueCell.style.textAlign = 'right'
    if (isTotal) {
      valueCell.style.color = '#2d8cf8'
      valueCell.style.fontSize = '1.1em'
    }
    
    row.appendChild(labelCell)
    row.appendChild(valueCell)
    return row
  }
  
  // Add rows
  table.appendChild(createRow('Gold Cost:', format_gold(results.gold)))
  table.appendChild(createRow('Expected Item Cost:', format_gold(results.itemCost) + ' (' + format_decimal(results.itemsConsumed) + ' items)'))
  table.appendChild(createRow('Expected Exalted Core Cost:', format_gold(results.exaltedCost) + ' (' + format_decimal(results.exaltedCores) + ' cores)'))
  table.appendChild(createRow('Expected Total Cost:', format_gold(results.totalCost), true))
  
  container.appendChild(table)
  
  // Add note about the calculation
  var note = document.createElement('p')
  note.style.marginTop = '15px'
  note.style.color = '#999'
  note.style.fontSize = '0.9em'
  note.style.fontStyle = 'italic'
  note.textContent = 'Note: Calculations assume 65% success rate and 50% tier loss chance on failure (using 2 Exalted Cores per fusion). Regular Fusion uses target items (not feeder items).'
  container.appendChild(note)
  
  resultsDiv.appendChild(container)
}

function calculate_fusion() {
  try {
    // Convert prices to numbers (prices are in kk/k, so multiply by 1,000,000 or 1,000)
    // Regular Fusion uses target items (not feeder items)
    var targetPriceNum = parseFloat(target_price) * 1000000 // kk to actual gold
    var exaltedPriceNum = parseFloat(exalted_price) * 1000 // k to actual gold
    
    // Validate price inputs
    if (isNaN(targetPriceNum) || isNaN(exaltedPriceNum) || targetPriceNum < 0 || exaltedPriceNum < 0) {
      throw new Error('Invalid price values')
    }
    
    // Fusion parameters
    var SUCCESS_RATE = 0.65 // 65% with 2 Exalted Cores
    var FAILURE_RATE = 0.35 // 35%
    var TIER_LOSS_CHANCE = 0.5 // 50% chance of tier loss on failure
    
    // Calculate expected items and fusions needed at each tier
    // Work backwards from target_tier to tier 0
    // Key: To produce 1 item at tier+1, we need 2 items at tier to fuse
    // Expected fusions to get 1 success = 1 / successRate
    
    // Track base items needed (without tier loss adjustments) for cost calculations
    var baseItemsAtTier = {}
    baseItemsAtTier[target_tier] = 1 // We want 1 item at target_tier
    
    // Track total items needed (including tier losses) for final item count
    var totalItemsAtTier = {}
    totalItemsAtTier[target_tier] = 1
    
    // Work backwards to calculate items needed at each tier
    for (var tier = target_tier - 1; tier >= 0; tier--) {
      var itemsNeededAtNextTier = baseItemsAtTier[tier + 1] || 0
      
      // To get itemsNeededAtNextTier items at tier+1, we need to fuse items at tier
      // Each successful fusion requires 2 items at tier and produces 1 item at tier+1
      // So minimum items needed = itemsNeededAtNextTier * 2
      // But we need to account for failures, so expected fusion attempts = itemsNeededAtNextTier / successRate
      var expectedFusions = itemsNeededAtNextTier / SUCCESS_RATE
      
      // Base items consumed in fusion attempts (each attempt uses 2 items)
      var baseItemsConsumed = expectedFusions * 2
      baseItemsAtTier[tier] = baseItemsConsumed
      
      // Account for tier losses: when fusion fails, 50% chance one item loses a tier
      var expectedTierLosses = expectedFusions * FAILURE_RATE * TIER_LOSS_CHANCE
      
      var additionalItemsNeeded = 0
      if (tier === 0) {
        // Tier 0: items are destroyed on tier loss, just need replacements
        additionalItemsNeeded = expectedTierLosses
      } else {
        // Tier > 0: items are downgraded to tier-1, need to rebuild them
        // To rebuild 1 item at tier, we need items at tier-1
        // Use base calculation: 2 / successRate (avoids feedback loop)
        // This is the expected items at tier-1 needed to produce 1 item at tier
        var itemsNeededPerRebuild = 2 / SUCCESS_RATE
        additionalItemsNeeded = expectedTierLosses * itemsNeededPerRebuild
      }
      
      totalItemsAtTier[tier] = baseItemsConsumed + additionalItemsNeeded
    }
    
    // Calculate costs for each tier transition using base items (actual fusions performed)
    var totalGold = 0
    var totalExaltedCores = 0
    var totalItemsConsumed = 0
    
    for (var currentTier = 0; currentTier < target_tier; currentTier++) {
      var nextTier = currentTier + 1
      
      // Get fusion cost for this tier transition
      var fusionGoldCost = get_fusion_gold_cost(item_classification, currentTier)
      if (fusionGoldCost === 0) {
        continue // Invalid tier transition for this classification
      }
      
      // Base items needed at nextTier (this is what we're trying to produce)
      var baseItemsNeededAtNextTier = baseItemsAtTier[nextTier] || 0
      
      // Expected fusions needed = baseItemsNeeded / successRate
      var expectedFusions = baseItemsNeededAtNextTier / SUCCESS_RATE
      
      // Each fusion uses 2 Exalted Cores and consumes 2 items
      var exaltedCoresForTier = expectedFusions * 2
      var itemsConsumedForTier = expectedFusions * 2
      var goldForTier = expectedFusions * fusionGoldCost
      
      totalGold += goldForTier
      totalExaltedCores += exaltedCoresForTier
      totalItemsConsumed += itemsConsumedForTier
    }
    
    // Total items consumed should be the total items needed at tier 0 (includes tier loss replacements)
    totalItemsConsumed = totalItemsAtTier[0] || 0
    
    // Calculate total cost including item prices
    // Regular Fusion uses target items (all items consumed are target items)
    var itemCost = totalItemsConsumed * targetPriceNum
    var exaltedCost = totalExaltedCores * exaltedPriceNum
    var totalCost = totalGold + itemCost + exaltedCost
    
    // Store results for display
    var fusionResults = {
      gold: totalGold,
      exaltedCores: totalExaltedCores,
      itemsConsumed: totalItemsConsumed,
      itemCost: itemCost,
      exaltedCost: exaltedCost,
      totalCost: totalCost
    }
    
    // Display results
    display_fusion_results(fusionResults)
    return fusionResults
  } catch (error) {
    console.error('Error in calculate_fusion:', error)
    var resultsDiv = document.getElementById('forge_results')
    if (resultsDiv) {
      var errorMsg = document.createElement('div')
      errorMsg.style.color = '#ff6b6b'
      errorMsg.style.padding = '10px'
      errorMsg.textContent = 'Error calculating fusion: ' + error.message
      resultsDiv.appendChild(errorMsg)
    }
    return null
  }
}

// Get the gold cost for fusing from currentTier to nextTier
function get_fusion_gold_cost(classification, currentTier) {
  var nextTier = currentTier + 1
  
  // Check if this tier transition is valid for this classification
  if (fusion_cost[classification] && fusion_cost[classification][nextTier]) {
    return fusion_cost[classification][nextTier]
  }
  
  return 0 // Invalid tier transition
}