# peer-review
This is a web tool to aid with class peer reviews during software engineering group projects. It is intended to help students create zero-sum evaluations of themselves and their teammates. As an instructor, you will need to provide them with a csv file of all students in the class organized by group. A template file `group_template.csv` can be found in this repository. The names of students go in the first column, the names of groups in the second. Each student will upload the file to this tool, and it will allow them to generate a file of their reviews to send to you through Canvas or whichever LMS your school uses.  

This design assumes that each deliverable includes some amount of code development and some amount of reporting. I tend to vary the weights when assigning grades, as early deliverables have more report and less dev, later and final deliverables have less report and more dev.

Once you have received all submissions, you can review them through the dashboard. This doesn't upload anything to a server, it uses javascript to create charts of the assigned scores in your own browser. 

## Links

- **Student review form:** https://jagodwin.github.io/peer-review/
- **Instructor analysis dashboard:** https://jagodwin.github.io/peer-review/analyze_reviews.html

## Sample Assignment Description

> For each of the estimates of effort in the survey, you and your teammates must SUM to 100. Do not put 100 for everyone for everything. There are only 100 points to go around, total, for each question. Think about it like this. You can pay your team \$100 total for development, and \$100 for their work on the report. That's it. So who gets paid what?
>
> For the questions:
>
> **How much effort (0-100%) did this team member put in for the project?**
>
> This includes implementation, design, configuration, anything about actually building the code.
>
> **How much effort (0-100%) did this team member put in for the report?**
>
> This includes writing, outlining, diagrams, proofreading, etc.
>
> If you have five team members and everyone contributed equally, then you would put 20% for yourself and everyone else.
>
> But, what I'd estimate is much more likely, is that the split would be uneven....
>
> Please use the tool at:
>
> **https://jagodwin.github.io/peer-review/**
>
> Upload the csv file I provided to you, and use the tool to set your review scores. Export the review csv and submit it here.
>
> If your percentages do not sum to 100 within each of the score columns, then you will not receive a grade for this assignment. If you do not sum the numbers, you will be assigned a zero for this assignment until you complete it correctly. DO NOT FORGET to give a self-review.


