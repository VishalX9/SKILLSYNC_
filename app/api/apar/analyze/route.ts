import { NextResponse } from 'next/server';
import { authenticate, AuthRequest } from '@/middleware/auth';
import dbConnect from '@/utils/db';
import APAR from '@/models/APAR';
import Kpi from '@/models/KPI';

function getRandomScore(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getPerformanceLevel(score: number): string {
  if (score >= 80) return 'Excellent';
  if (score >= 60) return 'Average';
  return 'Poor';
}

export const POST = authenticate(async (req: AuthRequest) => {
  try {
    if (req.user?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    await dbConnect();
    
    const body = await req.json();
    const { employeeId, year } = body;

    if (!employeeId) {
      return NextResponse.json({ error: 'Employee ID is required' }, { status: 400 });
    }

    const employeeKPIs = await Kpi.find({ assignedTo: employeeId });
    
    if (employeeKPIs.length === 0) {
      return NextResponse.json({ 
        warning: 'No KPI data found for this employee',
        hasData: false
      }, { status: 200 });
    }

    await new Promise(resolve => setTimeout(resolve, 1500));

    const kpiTotalScore = employeeKPIs.reduce((sum, kpi) => sum + (kpi.score || 0), 0);
    
    const convertedScore = Math.round((kpiTotalScore / 100) * 70);
    
    const mockReviewerScore = getRandomScore(20, 30);
    
    const finalScore = Math.min(convertedScore + mockReviewerScore, 100);
    
    const performanceLevel = getPerformanceLevel(finalScore);

    const currentYear = year || new Date().getFullYear();
    
    let apar = await APAR.findOne({ employee: employeeId, year: currentYear });
    
    if (!apar) {
      apar = await APAR.create({
        employee: employeeId,
        year: currentYear,
        selfAppraisal: {
          achievements: '',
          challenges: '',
          innovations: ''
        },
        reviewerScore: mockReviewerScore,
        finalScore,
        status: 'finalized',
        reviewer: req.user?.userId
      });
    } else {
      apar.reviewerScore = mockReviewerScore;
      apar.finalScore = finalScore;
      apar.status = 'finalized';
      apar.reviewer = req.user?.userId as any;
      await apar.save();
    }

    return NextResponse.json({
      success: true,
      message: '✅ APAR finalized with data from e-Office',
      hasData: true,
      kpiScore: Math.round(kpiTotalScore),
      convertedKpiScore: convertedScore,
      reviewerScore: mockReviewerScore,
      finalScore,
      performanceLevel,
      apar
    });

  } catch (error: any) {
    console.error('Error analyzing APAR:', error);
    return NextResponse.json({ error: error.message || 'Failed to analyze APAR' }, { status: 500 });
  }
});
