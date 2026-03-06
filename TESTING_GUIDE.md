# CV Analysis Testing Guide

## Quick Start Test

### Prerequisites
1. OpenAI API key set in Netlify environment variables
2. User logged in or demo account available
3. Sample PDF CV file

---

## Test Scenario 1: Frontend Developer Upload

### Step 1: Navigate to Upload CV Page
```
URL: http://localhost:3000/#/upload-cv
```

### Step 2: Setup
- Language: English
- Target Role: Frontend Engineer
- File: Use a PDF with React, JavaScript, HTML/CSS experience

### Expected Results
```
✓ PDF text extraction succeeds (1-2 seconds)
✓ Local analysis completes
✓ AI analysis returns within 8 seconds
✓ Job Fit Score displays (e.g., 72%)
✓ Color indicator is GREEN (>70%)
✓ Capability assessment reads: "You are capable..."
✓ Strengths list shows React, JavaScript, etc.
✓ Weaknesses list shows gaps (e.g., Backend, DevOps)
✓ Missing Skills section populated
✓ Suggestions section has 4 items
✓ Submit button clears file input
✓ Success message: "Saved. Your CV analysis is now in your account."
```

### Verify Save
1. Go to `/profile` (Smart Profile page)
2. Look for "CV Status" card
3. Should show: Job fit: 72%, Status: ✓ Saved

---

## Test Scenario 2: Career Pivot (Low Score)

### Step 1: Navigate to Upload CV Page
```
URL: http://localhost:3000/#/upload-cv
```

### Step 2: Setup
- Language: English
- Target Role: Backend Engineer
- File: PDF with only Frontend skills (React, JavaScript, CSS)

### Expected Results
```
✓ AI recognizes frontend-only background
✓ Job Fit Score: 35-45% (low)
✓ Color indicator: RED (<50%)
✓ Capability assessment: "You would need significant training..."
✓ Weaknesses: Many backend-specific gaps
✓ Suggestions focus on backend learning
```

---

## Test Scenario 3: High Score (Well-Matched)

### Step 1: Navigate to Upload CV Page

### Step 2: Setup
- Language: English  
- Target Role: Full-Stack Engineer
- File: PDF with varied skills (Frontend, Backend, Database, DevOps)

### Expected Results
```
✓ Job Fit Score: 75-90% (high)
✓ Color indicator: GREEN (≥70%)
✓ Capability assessment: "You are capable and can contribute immediately..."
✓ Strengths: Multiple relevant skills
✓ Weaknesses: Minor gaps only
✓ Suggestions: Advanced topics for growth
```

---

## Test Scenario 4: Refresh Behavior

### Step 1: Upload CV and see results
- Navigate to `/upload-cv`
- Upload file
- See analysis displayed

### Step 2: Refresh the page
```
Press F5 or Cmd+R
```

### Expected Results
```
✓ Page reloads
✓ Analysis display area shows: "Upload your CV to analyze it."
✓ Previous analysis is NOT shown (transient state reset)
✓ But saved to profile (data persists in Firestore)
```

### Step 3: Verify save persisted
1. Navigate to `/profile`
2. Check CV Status card
3. Job fit score should still show

---

## Test Scenario 5: New Upload Overwrites Old

### Step 1: Upload first CV
- Upload CV A (Frontend focus)
- See job fit: 72%
- Navigate to profile, verify save

### Step 2: Upload second CV (different background)
- Go back to `/upload-cv`
- Upload CV B (Backend focus) for same role
- See different job fit: 45%

### Expected Results
```
✓ New analysis overwrites old
✓ Old 72% is gone
✓ New 45% shows in display
✓ Smart Profile shows new 45%
✓ No history of previous 72%
```

---

## Test Scenario 6: Language Support (Arabic)

### Step 1: Switch to Arabic
- Click theme/language toggle
- Select Arabic (العربية)

### Step 2: Upload CV
- Navigate to upload page (now in Arabic)
- Target role: "مهندس واجهات أمامية" (Frontend Engineer)
- Upload CV

### Expected Results
```
✓ All text in Arabic
✓ Analysis performs correctly
✓ Job fit score displays
✓ Color coding works
✓ Capability assessment in Arabic
✓ All sections translated properly
```

---

## Test Scenario 7: Error Handling

### Test 7A: Missing File
- Click "Analyze CV" without selecting file
- Expected: Error "Choose a PDF first"

### Test 7B: Invalid File Type
- Upload non-PDF file
- Expected: Error "File must be a PDF"

### Test 7C: Scanned/Image PDF
- Upload PDF that's actually a scan
- Expected: Error "Could not extract clear text from PDF"

### Test 7D: OpenAI Unavailable
- Simulate by invalid API key temporarily
- Expected: Error "OpenAI analysis failed" with details

---

## Test Scenario 8: Job Application Integration

### Step 1: Upload CV with high fit score
- Upload CV with 75% fit for role

### Step 2: Go to Jobs page
- Navigate to `/jobs`
- Find matching job

### Step 3: View Job Details
- Click on job
- See CV analysis at top
- Should show same 75% fit score

### Expected Results
```
✓ CV upload card shows in job details
✓ File input allows re-upload
✓ Analysis works from job page
✓ Can apply if interview/behavior complete
```

---

## Test Scenario 9: Profile Completeness Gating

### Test 9A: Apply without interview
- Upload CV (creates cvAnalysis)
- Click "Apply for Job"
- Expected: "Complete interview first"

### Test 9B: Apply without behavior
- Complete interview
- Click "Apply for Job"
- Expected: "Complete behavioral simulation first"

### Test 9C: Apply with both complete
- Complete interview ✓
- Complete behavior ✓
- Click "Apply for Job"
- Expected: Success "You've applied for this job"

---

## Manual Verification Steps

### Check Firestore
```
1. Open Firebase console
2. Go to Firestore
3. Collection: users
4. Select test user
5. Check for cvAnalysis field:
   - Should contain all analysis data
   - Should have aiInsights with job_fit_score
   - topSkills array should be populated
```

### Check Browser Console
```
1. Open DevTools (F12)
2. Go to Console tab
3. You should NOT see:
   - Syntax errors
   - CORS errors
   - Missing variable warnings
4. You SHOULD see:
   - OpenAI API call logs
   - Success messages
```

### Check Network Tab
```
1. Open DevTools Network tab
2. Upload CV and analyze
3. Should see:
   - POST to /.netlify/functions/analyze-cv
   - Status: 200 OK
   - Response: JSON with job_fit_score, capability_assessment
4. Should NOT see:
   - 400/500 errors
   - CORS warnings
   - Failed requests
```

---

## Regression Testing

Run through before releasing updates:

- [ ] Upload PDF - text extraction works
- [ ] Local analysis displays skills
- [ ] AI analysis returns in <10 seconds
- [ ] Job fit score is numeric (0-100)
- [ ] Color coding works (green/yellow/red)
- [ ] Capability assessment displays
- [ ] Strengths section has content
- [ ] Weaknesses section has content
- [ ] Missing skills section populated
- [ ] Suggestions has 4 items
- [ ] Firestore save completes
- [ ] Profile page shows CV status
- [ ] Refresh clears display
- [ ] New upload overwrites old
- [ ] Arabic language works
- [ ] Error messages display properly
- [ ] Can apply after upload (with complete profile)

---

## Performance Benchmarks

Time to completion (target):

| Step | Target Time | Acceptable |
|------|------------|-----------|
| File upload | < 1s | < 2s |
| PDF extraction | < 2s | < 3s |
| Local analysis | < 1s | < 2s |
| AI analysis (OpenAI) | 3-5s | < 10s |
| Firestore save | < 2s | < 3s |
| Display update | < 500ms | < 1s |
| **Total** | **~7-11s** | **< 20s** |

---

## Sample Test CVs

### Sample 1: Strong Frontend Dev
```
Skills: React, JavaScript, TypeScript, CSS, HTML, Webpack, Git
Experience: 3 years Frontend, 2 companies
Education: BS Computer Science
Expected Score: 80-90% for Frontend role
```

### Sample 2: Junior Developer
```
Skills: Python, SQL, HTML, CSS, JavaScript (basic)
Experience: 1 year, bootcamp graduate
Education: Coding bootcamp certificate
Expected Score: 45-55% for Frontend role
```

### Sample 3: Career Changer
```
Skills: Project management, Communication, Excel, basic Python
Experience: 5 years non-tech
Education: MBA
Expected Score: 25-35% for Backend role
```

---

## Debugging Tips

### Issue: AI analysis takes too long
- Check OpenAI API status
- Verify API key is valid
- Check Netlify function logs
- Try with smaller CV text

### Issue: Job fit score is null
- Check AI response has job_fit_score field
- Verify OpenAI API returned valid JSON
- Check browser console for parse errors

### Issue: Analysis won't save
- Check Firestore permissions
- Verify auth user is logged in
- Check network tab for POST errors
- Review Firestore database rules

### Issue: CV won't upload
- Check file is valid PDF
- Verify file size < 50MB
- Check PDF isn't password protected
- Ensure PDF has text layer (not scan)

---

## Success Criteria

All tests pass when:
- ✅ Job fit score displays 0-100
- ✅ Color coding is accurate
- ✅ Capability assessment is realistic
- ✅ Strengths/weaknesses are role-specific
- ✅ Suggestions are actionable
- ✅ Data saves to Firestore
- ✅ Profile shows CV status
- ✅ Refresh clears transient display
- ✅ Errors handle gracefully
- ✅ Both languages work
- ✅ Performance is acceptable
- ✅ No console errors

---

**Testing Version**: 1.0  
**Last Updated**: 2026-03-04
