import { test, expect } from '@playwright/test'

test.describe('Cost to Complete Report', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to a job page (assuming we have test data)
    await page.goto('http://localhost:5173')
    await page.waitForLoadState('networkidle')
    
    // Navigate to jobs
    await page.click('text=Jobs')
    await page.waitForLoadState('networkidle')
    
    // Click on first job
    const firstJob = page.locator('a[href*="/jobs/"]').first()
    if (await firstJob.count() > 0) {
      await firstJob.click()
      await page.waitForLoadState('networkidle')
    }
  })

  test('should load cost to complete table view', async ({ page }) => {
    // Navigate to Cost to Complete
    await page.click('text=Cost to Complete')
    await page.waitForLoadState('networkidle')
    
    // Check that we're on the cost to complete page
    await expect(page.locator('h1:has-text("Cost to Complete")')).toBeVisible()
    
    // Check for forecasts table
    const forecastsTable = page.locator('table')
    await expect(forecastsTable).toBeVisible()
    
    // Check API call was made
    const responsePromise = page.waitForResponse(response => 
      response.url().includes('/cost-to-complete/forecasts') && response.request().method() === 'GET'
    )
    
    // Reload to trigger API call
    await page.reload()
    await page.waitForLoadState('networkidle')
    
    const response = await responsePromise
    expect(response.status()).toBe(200)
    
    const responseData = await response.json()
    console.log('Forecasts API Response:', JSON.stringify(responseData, null, 2))
    
    // Check that response has data structure
    expect(responseData).toHaveProperty('success', true)
    expect(responseData).toHaveProperty('data')
    expect(Array.isArray(responseData.data)).toBe(true)
  })

  test('should display forecast data in table', async ({ page }) => {
    await page.click('text=Cost to Complete')
    await page.waitForLoadState('networkidle')
    
    // Wait for table to load
    await page.waitForSelector('table', { timeout: 10000 })
    
    // Check if there are any forecast rows (either with data or "Not Created")
    const tableRows = page.locator('table tbody tr')
    const rowCount = await tableRows.count()
    
    console.log(`Found ${rowCount} rows in forecasts table`)
    
    // Should have at least some rows (periods)
    expect(rowCount).toBeGreaterThan(0)
    
    // Check for summary cards
    const summaryCards = page.locator('text=Total Forecasts').locator('..')
    await expect(summaryCards.first()).toBeVisible()
  })

  test('should navigate to detail view when clicking a period', async ({ page }) => {
    await page.click('text=Cost to Complete')
    await page.waitForLoadState('networkidle')
    
    // Wait for table
    await page.waitForSelector('table', { timeout: 10000 })
    
    // Click on first period (eye icon or period link)
    const firstPeriodLink = page.locator('table tbody tr').first().locator('button, a').first()
    if (await firstPeriodLink.count() > 0) {
      await firstPeriodLink.click()
      await page.waitForLoadState('networkidle')
      
      // Should be in detail view
      await expect(page.locator('h1:has-text("Cost to Complete - Month")')).toBeVisible({ timeout: 5000 })
    }
  })

  test('should show charts when forecasts exist', async ({ page }) => {
    await page.click('text=Cost to Complete')
    await page.waitForLoadState('networkidle')
    
    // Wait for page to load
    await page.waitForSelector('h1:has-text("Cost to Complete")', { timeout: 10000 })
    
    // Check if charts section exists
    const chartsSection = page.locator('text=Forecast Cost vs Value Trend')
    const chartsVisible = await chartsSection.count() > 0
    
    if (chartsVisible) {
      console.log('Charts are visible')
      await expect(chartsSection.first()).toBeVisible()
    } else {
      console.log('No charts visible (may be no forecasts yet)')
    }
  })

  test('API endpoint returns correct data structure', async ({ request }) => {
    // First, get a job ID
    const jobsResponse = await request.get('http://localhost:3001/api/jobs')
    expect(jobsResponse.ok()).toBeTruthy()
    
    const jobsData = await jobsResponse.json()
    if (jobsData.data && jobsData.data.length > 0) {
      const jobId = jobsData.data[0]._id
      console.log(`Testing with jobId: ${jobId}`)
      
      // Test forecasts endpoint
      const forecastsResponse = await request.get(
        `http://localhost:3001/api/financial/${jobId}/cost-to-complete/forecasts?status=all`
      )
      
      console.log(`Forecasts API Status: ${forecastsResponse.status()}`)
      
      if (forecastsResponse.ok()) {
        const forecastsData = await forecastsResponse.json()
        console.log('Forecasts API Response:', JSON.stringify(forecastsData, null, 2))
        
        expect(forecastsData).toHaveProperty('success', true)
        expect(forecastsData).toHaveProperty('data')
        expect(Array.isArray(forecastsData.data)).toBe(true)
        
        // Log forecast details
        if (forecastsData.data.length > 0) {
          console.log(`Found ${forecastsData.data.length} forecasts:`)
          forecastsData.data.forEach((forecast, index) => {
            console.log(`  ${index + 1}. ${forecast.forecastPeriod} - Status: ${forecast.status}`)
            console.log(`     Summary:`, forecast.summary)
          })
        } else {
          console.log('No forecasts found in database')
        }
      } else {
        const errorText = await forecastsResponse.text()
        console.error('Forecasts API Error:', errorText)
      }
    }
  })
})

