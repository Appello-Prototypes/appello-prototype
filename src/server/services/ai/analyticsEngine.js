const dataAccess = require('./dataAccess');

class AnalyticsEngine {
  /**
   * Calculate Earned Value Management metrics
   */
  async calculateEVM(jobId) {
    const metrics = await dataAccess.getJobMetrics(jobId);
    const scheduleAnalysis = await dataAccess.getScheduleAnalysis(jobId);

    const contractValue = metrics.job.contractValue;
    // Use progress from metrics (which prefers overallProgress from job)
    const progress = (metrics.metrics.progress !== undefined ? metrics.metrics.progress : metrics.metrics.taskProgress) / 100;
    const actualCost = metrics.metrics.totalCost;

    // Planned Value (PV) - Budgeted cost of work scheduled
    // Cap expected progress at 100% to avoid unrealistic values
    const expectedProgressPercent = Math.min(100, scheduleAnalysis.expectedProgress);
    const plannedValue = contractValue * (expectedProgressPercent / 100);

    // Earned Value (EV) - Budgeted cost of work performed
    const earnedValue = contractValue * progress;

    // Actual Cost (AC)
    const actualCostValue = actualCost;

    // Schedule Performance Index (SPI)
    const spi = plannedValue > 0 ? earnedValue / plannedValue : (progress > 0 ? 1 : 0);

    // Cost Performance Index (CPI)
    // Handle edge cases: if no costs yet but progress exists, CPI = 1 (on track)
    // If costs exist, calculate normally
    let cpi = 0;
    if (actualCostValue > 0) {
      cpi = earnedValue / actualCostValue;
    } else if (progress > 0) {
      // No costs yet but work has been done - assume on track
      cpi = 1.0;
    }

    // Schedule Variance (SV)
    const scheduleVariance = earnedValue - plannedValue;

    // Cost Variance (CV)
    const costVariance = earnedValue - actualCostValue;

    // Estimate at Completion (EAC)
    const eac = cpi > 0 ? contractValue / cpi : contractValue;

    // Variance at Completion (VAC)
    const varianceAtCompletion = contractValue - eac;

    // Estimate to Complete (ETC)
    const etc = eac - actualCostValue;

    return {
      plannedValue,
      earnedValue,
      actualCost: actualCostValue,
      schedulePerformanceIndex: spi,
      costPerformanceIndex: cpi,
      scheduleVariance,
      costVariance,
      estimateAtCompletion: eac,
      varianceAtCompletion,
      estimateToComplete: etc,
      progress,
      contractValue
    };
  }

  /**
   * Calculate variance analysis
   */
  async calculateVariance(jobId) {
    const metrics = await dataAccess.getJobMetrics(jobId);
    const costCodeAnalysis = await dataAccess.getCostCodeAnalysis(jobId);
    const scheduleAnalysis = await dataAccess.getScheduleAnalysis(jobId);

    // Budget variance
    const budgetVariance = {
      total: metrics.metrics.budgetVariance,
      percent: metrics.metrics.budgetVariancePercent,
      status: metrics.metrics.budgetVariancePercent > 0 ? 'under_budget' : 'over_budget'
    };

    // Schedule variance
    const scheduleVariance = {
      days: scheduleAnalysis.scheduleVariance,
      progressVariance: scheduleAnalysis.progressVariance,
      status: scheduleAnalysis.progressVariance > 0 ? 'ahead' : 'behind'
    };

    // Cost code variances
    const costCodeVariances = costCodeAnalysis
      .filter(cc => Math.abs(cc.costVariancePercent) > 5)
      .sort((a, b) => Math.abs(b.costVariancePercent) - Math.abs(a.costVariancePercent));

    return {
      budgetVariance,
      scheduleVariance,
      costCodeVariances,
      criticalVariances: costCodeVariances.slice(0, 5)
    };
  }

  /**
   * Calculate trends
   */
  async calculateTrends(jobId, days = 30) {
    const timeEntries = await require('../../models/TimeEntry').find({
      jobId,
      date: { $gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000) }
    })
      .sort({ date: 1 })
      .lean();

    // Group by date
    const dailyData = {};
    timeEntries.forEach(entry => {
      const date = entry.date.toISOString().split('T')[0];
      if (!dailyData[date]) {
        dailyData[date] = { date, hours: 0, cost: 0, entries: 0 };
      }
      dailyData[date].hours += entry.totalHours || 0;
      dailyData[date].cost += (entry.regularHours || 0) * 50 + (entry.overtimeHours || 0) * 75;
      dailyData[date].entries += 1;
    });

    const trendData = Object.values(dailyData).sort((a, b) => 
      new Date(a.date) - new Date(b.date)
    );

    // Calculate average daily hours
    const avgDailyHours = trendData.length > 0
      ? trendData.reduce((sum, d) => sum + d.hours, 0) / trendData.length
      : 0;

    // Calculate trend direction
    if (trendData.length < 2) {
      return {
        trendData,
        avgDailyHours,
        trend: 'insufficient_data'
      };
    }

    const firstHalf = trendData.slice(0, Math.floor(trendData.length / 2));
    const secondHalf = trendData.slice(Math.floor(trendData.length / 2));
    const firstAvg = firstHalf.reduce((sum, d) => sum + d.hours, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, d) => sum + d.hours, 0) / secondHalf.length;
    const trend = secondAvg > firstAvg ? 'increasing' : secondAvg < firstAvg ? 'decreasing' : 'stable';

    return {
      trendData,
      avgDailyHours,
      trend,
      trendPercent: firstAvg > 0 ? ((secondAvg - firstAvg) / firstAvg) * 100 : 0
    };
  }

  /**
   * Compare jobs
   */
  async compareJobs(jobIds) {
    const comparisons = await Promise.all(
      jobIds.map(async (id) => {
        const metrics = await dataAccess.getJobMetrics(id);
        const evm = await this.calculateEVM(id);
        const variance = await this.calculateVariance(id);
        return {
          jobId: id,
          job: metrics.job,
          metrics: metrics.metrics,
          evm,
          variance
        };
      })
    );

    // Calculate averages
    const avgProgress = comparisons.reduce((sum, c) => sum + c.metrics.taskProgress, 0) / comparisons.length;
    const avgBudgetVariance = comparisons.reduce((sum, c) => sum + c.metrics.budgetVariancePercent, 0) / comparisons.length;
    const avgCPI = comparisons.reduce((sum, c) => sum + c.evm.costPerformanceIndex, 0) / comparisons.length;

    return {
      jobs: comparisons,
      averages: {
        progress: avgProgress,
        budgetVariance: avgBudgetVariance,
        costPerformanceIndex: avgCPI
      },
      bestPerformer: comparisons.reduce((best, current) => 
        current.evm.costPerformanceIndex > best.evm.costPerformanceIndex ? current : best
      ),
      worstPerformer: comparisons.reduce((worst, current) =>
        current.evm.costPerformanceIndex < worst.evm.costPerformanceIndex ? current : worst
      )
    };
  }

  /**
   * Get job health score
   */
  async getJobHealthScore(jobId) {
    const metrics = await dataAccess.getJobMetrics(jobId);
    const evm = await this.calculateEVM(jobId);
    const variance = await this.calculateVariance(jobId);
    const scheduleAnalysis = await dataAccess.getScheduleAnalysis(jobId);

    let score = 100;

    // Deduct points for budget variance
    if (metrics.metrics.budgetVariancePercent < -10) score -= 30;
    else if (metrics.metrics.budgetVariancePercent < -5) score -= 15;
    else if (metrics.metrics.budgetVariancePercent < 0) score -= 5;

    // Deduct points for schedule variance
    if (scheduleAnalysis.progressVariance < -20) score -= 30;
    else if (scheduleAnalysis.progressVariance < -10) score -= 15;
    else if (scheduleAnalysis.progressVariance < 0) score -= 5;

    // Deduct points for CPI
    if (evm.costPerformanceIndex < 0.9) score -= 20;
    else if (evm.costPerformanceIndex < 0.95) score -= 10;

    // Deduct points for overdue tasks
    if (scheduleAnalysis.overdueTasks > 5) score -= 15;
    else if (scheduleAnalysis.overdueTasks > 0) score -= 5;

    score = Math.max(0, Math.min(100, score));

    let status = 'excellent';
    if (score < 50) status = 'critical';
    else if (score < 70) status = 'warning';
    else if (score < 85) status = 'good';

    return {
      score,
      status,
      factors: {
        budgetVariance: metrics.metrics.budgetVariancePercent,
        scheduleVariance: scheduleAnalysis.progressVariance,
        costPerformanceIndex: evm.costPerformanceIndex,
        overdueTasks: scheduleAnalysis.overdueTasks
      }
    };
  }
}

module.exports = new AnalyticsEngine();

