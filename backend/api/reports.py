from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import List
import os, json
from database import get_db
import models, schemas
from auth import get_current_user

router = APIRouter()

def generate_pdf_report(assessment: models.Assessment, risks: list, output_path: str):
    try:
        from reportlab.lib.pagesizes import letter, A4
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.lib.units import inch
        from reportlab.lib import colors
        from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
        from reportlab.lib.enums import TA_CENTER, TA_LEFT
        
        doc = SimpleDocTemplate(output_path, pagesize=A4, topMargin=0.5*inch, bottomMargin=0.5*inch)
        styles = getSampleStyleSheet()
        story = []
        
        # Title
        title_style = ParagraphStyle('Title', parent=styles['Title'], fontSize=24, textColor=colors.HexColor('#6366F1'), spaceAfter=12)
        story.append(Paragraph("Risk Management Report", title_style))
        story.append(Paragraph(assessment.title, styles['Heading1']))
        story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor('#6366F1')))
        story.append(Spacer(1, 0.2*inch))
        
        # Assessment details
        story.append(Paragraph("Assessment Details", styles['Heading2']))
        details = [
            ["Industry", assessment.industry or "N/A"],
            ["Organization Size", assessment.organization_size or "N/A"],
            ["Status", assessment.status],
            ["Overall Risk Score", f"{assessment.overall_score:.1f}/10"],
        ]
        t = Table(details, colWidths=[2*inch, 4*inch])
        t.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#F1F5F9')),
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#E2E8F0')),
            ('PADDING', (0, 0), (-1, -1), 6),
        ]))
        story.append(t)
        story.append(Spacer(1, 0.2*inch))
        
        # AI Analysis
        if assessment.ai_analysis:
            story.append(Paragraph("AI Risk Analysis", styles['Heading2']))
            story.append(Paragraph(assessment.ai_analysis[:1000] + "...", styles['Normal']))
            story.append(Spacer(1, 0.2*inch))
        
        # Risk Register
        story.append(Paragraph("Risk Register", styles['Heading2']))
        if risks:
            risk_data = [["Risk Name", "Category", "Probability", "Impact", "Score", "Status"]]
            for risk in risks:
                risk_data.append([
                    risk.name[:30],
                    risk.category,
                    risk.probability,
                    risk.impact,
                    str(risk.score),
                    risk.status
                ])
            rt = Table(risk_data, colWidths=[2*inch, 1*inch, 1*inch, 0.8*inch, 0.7*inch, 0.8*inch])
            rt.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#6366F1')),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#E2E8F0')),
                ('PADDING', (0, 0), (-1, -1), 6),
                ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#F8FAFC')]),
            ]))
            story.append(rt)
        else:
            story.append(Paragraph("No risks recorded for this assessment.", styles['Normal']))
        
        doc.build(story)
        return True
    except Exception as e:
        print(f"PDF generation error: {e}")
        # Create a simple text file as fallback
        with open(output_path.replace('.pdf', '.txt'), 'w') as f:
            f.write(f"Risk Report: {assessment.title}\n\n")
            f.write(f"Overall Score: {assessment.overall_score}\n\n")
            for risk in risks:
                f.write(f"- {risk.name}: {risk.severity} ({risk.score})\n")
        return False

@router.get("/", response_model=List[schemas.ReportResponse])
def list_reports(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    reports = db.query(models.Report).filter(
        models.Report.created_by_id == current_user.id
    ).order_by(models.Report.created_at.desc()).all()
    return reports

@router.post("/", response_model=schemas.ReportResponse)
def create_report(data: schemas.ReportCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    assessment = db.query(models.Assessment).filter(
        models.Assessment.id == data.assessment_id,
        models.Assessment.created_by_id == current_user.id
    ).first()
    if not assessment:
        raise HTTPException(status_code=404, detail="Assessment not found")
    
    title = data.title or f"{assessment.title} - {data.report_type.title()} Report"
    
    report = models.Report(
        title=title,
        report_type=data.report_type,
        assessment_id=data.assessment_id,
        created_by_id=current_user.id,
        status="generating"
    )
    db.add(report)
    db.flush()
    
    # Generate file
    os.makedirs("reports", exist_ok=True)
    file_path = f"reports/report_{report.id}.pdf"
    risks = db.query(models.Risk).filter(models.Risk.assessment_id == assessment.id).all()
    
    success = generate_pdf_report(assessment, risks, file_path)
    report.file_path = file_path
    report.status = "ready"
    
    db.commit()
    db.refresh(report)
    return report

@router.get("/{report_id}/download")
def download_report(report_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    report = db.query(models.Report).filter(
        models.Report.id == report_id,
        models.Report.created_by_id == current_user.id
    ).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    
    if report.file_path and os.path.exists(report.file_path):
        return FileResponse(report.file_path, media_type="application/pdf", filename=f"{report.title}.pdf")
    raise HTTPException(status_code=404, detail="Report file not found")
