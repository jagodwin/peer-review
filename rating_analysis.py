import os
import pandas as pd
import tkinter as tk
from tkinter import ttk, filedialog, messagebox
from matplotlib.figure import Figure
from matplotlib.backends.backend_tkagg import FigureCanvasTkAgg
from textblob import TextBlob
from collections import Counter
import re
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Image
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib.pagesizes import letter
import tempfile
from reportlab.lib.units import inch
from transformers import pipeline
import torch

sentiment_analyzer = pipeline("sentiment-analysis")
# ner_pipeline = pipeline("ner", model="dslim/bert-base-NER", device=-1)  # CPU

def summarize_comments(comments):
    """Generate a richer summary for a small set of comments using transformers."""
    # Keep only non-empty strings
    comments = [c for c in comments if isinstance(c, str) and c.strip()]
    if not comments:
        return "No comments available."

    # --- Sentiment analysis using transformer ---
    sentiments = sentiment_analyzer(comments)
    # Calculate average sentiment polarity: assign +1 for POSITIVE, -1 for NEGATIVE, weighted by score
    scores = [1 * s['score'] if s['label'] == 'POSITIVE' else -1 * s['score'] for s in sentiments]
    avg_sentiment = sum(scores) / len(scores)
    if avg_sentiment > 0.2:
        sentiment_summary = "Overall positive feedback"
    elif avg_sentiment < -0.2:
        sentiment_summary = "Overall negative feedback"
    else:
        sentiment_summary = "Mixed or neutral feedback"

    # --- Keyword extraction ---
    words = []
    for comment in comments:
        tokens = re.findall(r'\b[a-zA-Z]{3,}\b', comment.lower())
        words.extend(tokens)
    stop_words = set([
        'the', 'and', 'for', 'with', 'from', 'this', 'that', 'was', 'but', 'are',
        'they', 'their', 'has', 'have', 'not', 'all', 'you', 'your', 'can', 'did'
    ])
    keywords = [w for w in words if w not in stop_words]
    most_common = Counter(keywords).most_common(5)
    keyword_summary = ", ".join([w for w, _ in most_common]) if most_common else "No prominent keywords"

    return f"{sentiment_summary}; Key points: {keyword_summary}"





# ------------------------------
# Load all CSV files in a directory
# ------------------------------
def load_csv_dir(path):
    all_data = []
    for fname in os.listdir(path):
        if fname.endswith('.csv'):
            df = pd.read_csv(os.path.join(path, fname))
            all_data.append(df)
    if all_data:
        return pd.concat(all_data, ignore_index=True)
    else:
        return pd.DataFrame()

# ------------------------------
# GUI Application
# ------------------------------
class RatingAnalyzer(tk.Tk):
    def __init__(self):
        super().__init__()
        self.title("Class Rating Analysis")
        self.geometry("1600x1000")
        self.data = pd.DataFrame()
        self.boxplot_canvas = None

        # --- Top Frame: folder selection ---
        top_frame = tk.Frame(self)
        top_frame.pack(pady=10)
        tk.Button(top_frame, text="Load CSV Folder", command=self.load_folder).pack(side=tk.LEFT, padx=5)
        self.folder_label = tk.Label(top_frame, text="No folder selected")
        self.folder_label.pack(side=tk.LEFT, padx=5)

        tk.Button(top_frame, text="Choose Export Folder", command=self.choose_export_folder).pack(side=tk.LEFT, padx=5)
        self.export_folder_label = tk.Label(top_frame, text="No folder selected")
        self.export_folder_label.pack(side=tk.LEFT, padx=5)

        self.export_all_btn = tk.Button(top_frame, text="Export All Students", state='disabled',
                                        command=self.export_all_students)
        self.export_all_btn.pack(side=tk.LEFT, padx=5)

        self.export_folder = None  # Track export folder

        # --- Student Overview Tab Only ---
        self.student_overview_frame = tk.Frame(self)
        self.student_overview_frame.pack(expand=True, fill='both')

        # --- Student Overview Paned Layout ---
        self.student_overview_paned = tk.PanedWindow(self.student_overview_frame, orient=tk.HORIZONTAL)
        self.student_overview_paned.pack(expand=True, fill='both')

        # Left pane: Student overview / group summary
        self.student_overview_text = tk.Text(self.student_overview_paned, wrap='word')
        self.student_overview_paned.add(self.student_overview_text)

        # Right pane: combo + plot + student detail text
        right_pane = tk.Frame(self.student_overview_paned)
        right_pane.pack(expand=True, fill='both')

        # Combo box on top
        combo_frame = tk.Frame(right_pane)
        combo_frame.pack(fill='x', padx=5, pady=5)
        tk.Label(combo_frame, text="Select Student:").pack(side=tk.LEFT)
        self.student_var = tk.StringVar()
        self.student_menu = ttk.Combobox(combo_frame, textvariable=self.student_var)
        self.student_menu.pack(side=tk.LEFT, padx=5)
        self.student_var.trace('w', self.show_student_stats)

        # Box-and-whisker plot frame
        self.plot_frame = tk.Frame(right_pane)
        self.plot_frame.pack(fill='x', padx=5, pady=5)
        self.figure = Figure(figsize=(6, 2.5))
        self.ax = self.figure.add_subplot(111)
        self.canvas = FigureCanvasTkAgg(self.figure, master=self.plot_frame)
        self.canvas.get_tk_widget().pack(fill='x', expand=True)

        # Student detail text below plot
        self.student_text = tk.Text(right_pane, wrap='word', height=25)
        self.student_text.pack(expand=True, fill='both', padx=5, pady=5)

        # Add right pane to paned window
        self.student_overview_paned.add(right_pane)

        # Configure coloring tags
        for text_widget in [self.student_text, self.student_overview_text]:
            text_widget.tag_configure('green', foreground='green')
            text_widget.tag_configure('red', foreground='red')
            text_widget.tag_configure('black', foreground='black')

    # ------------------------------
    # Choose export folder
    # ------------------------------
    def choose_export_folder(self):
        folder = filedialog.askdirectory()
        if folder:
            self.export_folder = folder
            self.export_folder_label.config(text=folder)
            self.export_all_btn.config(state='normal')

    # ------------------------------
    # Export all students
    # ------------------------------
    def export_all_students(self):
        if not self.export_folder:
            messagebox.showerror("Error", "Please choose an export folder first.")
            return

        for student in self.student_menu['values']:
            self.export_student_pdf(student)

        messagebox.showinfo("Export Complete",
                            f"Exported {len(self.student_menu['values'])} students to {self.export_folder}")

    # ------------------------------
    # Export a single student to PDF
    # ------------------------------
    def export_student_pdf(self, student_name):
        if self.data.empty:
            return

        student_data = self.data[self.data['Member Name'] == student_name]
        if student_data.empty:
            return

        group_name = student_data['Group Name'].iloc[0]

        # --- Extract self dev/report comments ---
        self_rating = student_data[student_data['Reviewer'] == student_name]
        dev_comment = self_rating['Dev Comments'].values[0] if not self_rating.empty else ""
        report_comment = self_rating['Report Comments'].values[0] if not self_rating.empty else ""

        # --- Generate comments summary ---
        about_student = student_data
        all_comments = []
        for _, row in about_student.iterrows():
            for c in [row['Dev Comments'], row['Report Comments']]:
                if isinstance(c, str) and c.strip():
                    all_comments.append(c.strip())
        summary_text = summarize_comments(all_comments) if all_comments else "No comments available."

        fig = Figure(figsize=(6, 3), dpi=100)
        ax = fig.add_subplot(111)

        # Horizontal boxplot with Dev on top
        ax.boxplot([about_student['Norm Dev'], about_student['Norm Report']],
                   labels=['Dev', 'Report'], vert=False)
        ax.axvline(1, color='gray', linestyle='--')

        # Self-reported scores
        if not self_rating.empty:
            ax.plot(self_rating['Norm Dev'].values[0], 1, 'rx', markersize=10)
            ax.plot(self_rating['Norm Report'].values[0], 2, 'rx', markersize=10)

        ax.set_title(f"Scores Received: {student_name}")
        ax.grid(True)

        tmp_file = tempfile.NamedTemporaryFile(delete=False, suffix=".png")
        fig.savefig(tmp_file.name, bbox_inches='tight', dpi=100)
        tmp_file.close()

        # --- Create PDF ---
        pdf_path = os.path.join(self.export_folder, f"{student_name}_Report.pdf")
        doc = SimpleDocTemplate(pdf_path, pagesize=letter,
                                rightMargin=50, leftMargin=50, topMargin=50, bottomMargin=50)
        styles = getSampleStyleSheet()
        story = []

        # Header
        story.append(Paragraph(f"Student: {student_name}    Group: {group_name}", styles['Heading2']))
        story.append(Spacer(1, 12))

        # Boxplot caption
        story.append(Paragraph("Note: Red X = self-reported value", styles['Normal']))
        story.append(Spacer(1, 6))

        # Boxplot image
        story.append(Image(tmp_file.name, width=6 * inch, height=3 * inch))
        story.append(Spacer(1, 12))

        # Self-report section
        story.append(Paragraph("--- Student Self Report ---", styles['Heading3']))
        story.append(Paragraph(f"Dev comment: {dev_comment.strip() if dev_comment else '(none)'}", styles['Normal']))
        story.append(
            Paragraph(f"Report comment: {report_comment.strip() if report_comment else '(none)'}", styles['Normal']))
        story.append(Spacer(1, 12))

        # Comments summary
        story.append(Paragraph("--- Comments Summary ---", styles['Heading3']))
        story.append(Paragraph(summary_text, styles['Normal']))

        # Build PDF
        doc.build(story)

        # Clean up temp file
        os.unlink(tmp_file.name)

    # ------------------------------
    # Load folder and CSVs
    # ------------------------------
    def load_folder(self):
        folder = filedialog.askdirectory()
        if folder:
            self.folder_label.config(text=folder)
            self.data = load_csv_dir(folder)
            if self.data.empty:
                messagebox.showerror("Error", "No CSV files found in folder.")
                return

            # Normalize Dev/Report scores relative to expected points per member
            norm_dev, norm_report = [], []
            for idx, row in self.data.iterrows():
                group_members = self.data[self.data['Group Name'] == row['Group Name']]['Member Name'].unique()
                group_size = len(group_members)
                expected_per_member = 100 / group_size
                norm_dev.append(row['Dev Value'] / expected_per_member)
                norm_report.append(row['Report Value'] / expected_per_member)

            self.data['Norm Dev'] = norm_dev
            self.data['Norm Report'] = norm_report

            # Populate student combo box
            students = sorted(self.data['Reviewer'].unique())
            self.student_menu['values'] = students

            # Update overview
            self.update_student_overview()
            messagebox.showinfo("Success", f"Loaded {len(students)} students.")

    # ------------------------------
    # Student View: Ratings Given / Received with Plot
    # ------------------------------
    def show_student_stats(self, *args):
        selected = self.student_var.get()
        if not selected or self.data.empty:
            return

        for widget in self.plot_frame.winfo_children():
            widget.destroy()

        # Clear previous student text
        self.student_text.delete('1.0', tk.END)

        # Remove old box plot if exists
        if hasattr(self, 'boxplot_canvas') and self.boxplot_canvas:
            self.boxplot_canvas.get_tk_widget().destroy()
            self.boxplot_canvas = None

        by_student = self.data[self.data['Reviewer'] == selected]
        about_student = self.data[self.data['Member Name'] == selected]

        # --- Box plot of received scores ---
        # --- Box plot of received scores ---
        if not about_student.empty:
            fig = Figure(figsize=(4, 2.5), dpi=100)
            ax = fig.add_subplot(111)

            # Dev above Report
            ax.boxplot([about_student['Norm Report'], about_student['Norm Dev']],  # reversed order
                       vert=False, labels=['Report', 'Dev'])  # label order matches data

            # Center around 1
            ax.set_xlim(0, 2)
            ax.axvline(1, color='gray', linestyle='--', linewidth=1)

            self_rating = about_student[about_student['Reviewer'] == selected]
            if not self_rating.empty:
                self_dev = self_rating['Norm Dev'].values[0]  # note the space
                self_report = self_rating['Norm Report'].values[0]
                # y positions: 1 = Report (bottom), 2 = Dev (top)
                ax.plot(self_report, 1, 'rx', markersize=10, label='Self Report')
                ax.plot(self_dev, 2, 'rx', markersize=10)

            ax.set_title(f"Scores Received: {selected}")
            ax.grid(True)

            # Clear previous plot
            for widget in self.plot_frame.winfo_children():
                widget.destroy()

            self.boxplot_canvas = FigureCanvasTkAgg(fig, master=self.plot_frame)
            self.boxplot_canvas.draw()
            self.boxplot_canvas.get_tk_widget().pack(fill='x', padx=5, pady=5)

        # --- Meta-analysis ---
        if not about_student.empty:
            dev_mean = about_student['Norm Dev'].mean()
            dev_median = about_student['Norm Dev'].median()
            report_mean = about_student['Norm Report'].mean()
            report_median = about_student['Norm Report'].median()

            self_rating = about_student[about_student['Reviewer'] == selected]
            if not self_rating.empty:
                self_dev = self_rating['Norm Dev'].values[0]
                self_report = self_rating['Norm Report'].values[0]
            else:
                self_dev = None
                self_report = None

            self.student_text.insert(tk.END, f"--- {selected} Meta-Analysis (Normalized) ---\n")
            self.student_text.insert(tk.END, f"Dev: mean={dev_mean:.2f}, median={dev_median:.2f}")
            if self_dev is not None:
                self.student_text.insert(tk.END, f", self-rated={self_dev:.2f}")
            self.student_text.insert(tk.END, "\n")
            self.student_text.insert(tk.END, f"Report: mean={report_mean:.2f}, median={report_median:.2f}")
            if self_report is not None:
                self.student_text.insert(tk.END, f", self-rated={self_report:.2f}")
            self.student_text.insert(tk.END, "\n\n")

        # --- Ratings GIVEN ---
        self.student_text.insert(tk.END, f"--- Ratings GIVEN by {selected} (Normalized) ---\n")
        for _, row in by_student.iterrows():
            dev_color = 'green' if row['Norm Dev'] > 1 else 'red' if row['Norm Dev'] < 0.75 else 'black'
            report_color = 'green' if row['Norm Report'] > 1 else 'red' if row['Norm Report'] < 0.75 else 'black'

            self.student_text.insert(tk.END, f"{row['Member Name']}: Dev=")
            self.student_text.insert(tk.END, f"{row['Norm Dev']:.2f}", dev_color)
            self.student_text.insert(tk.END, ", Report=")
            self.student_text.insert(tk.END, f"{row['Norm Report']:.2f}", report_color)
            self.student_text.insert(tk.END,
                                     f"\nComments: Dev: {row['Dev Comments']} | Report: {row['Report Comments']}\n\n")

        # --- Ratings RECEIVED ---
        self.student_text.insert(tk.END, f"--- Ratings RECEIVED by {selected} (Normalized) ---\n")
        for _, row in about_student.iterrows():
            dev_color = 'green' if row['Norm Dev'] > 1 else 'red' if row['Norm Dev'] < 0.75 else 'black'
            report_color = 'green' if row['Norm Report'] > 1 else 'red' if row['Norm Report'] < 0.75 else 'black'

            self.student_text.insert(tk.END, f"From {row['Reviewer']}: Dev=")
            self.student_text.insert(tk.END, f"{row['Norm Dev']:.2f}", dev_color)
            self.student_text.insert(tk.END, ", Report=")
            self.student_text.insert(tk.END, f"{row['Norm Report']:.2f}", report_color)
            self.student_text.insert(tk.END,
                                     f"\nComments: Dev: {row['Dev Comments']} | Report: {row['Report Comments']}\n\n")

        # --- Comments summary ---
        all_comments = []
        for _, row in about_student.iterrows():
            for c in [row['Dev Comments'], row['Report Comments']]:
                if isinstance(c, str) and c.strip():
                    all_comments.append(c.strip())
        if all_comments:
            summary_text = summarize_comments(all_comments)
            self.student_text.insert(tk.END, f"--- Comments Summary ---\n{summary_text}\n")

    # ------------------------------
    # Student Overview Tab
    # ------------------------------
    def update_student_overview(self):
        if self.data.empty:
            return
        self.student_overview_text.delete('1.0', tk.END)

        for group_name in sorted(self.data['Group Name'].unique()):
            group_df = self.data[self.data['Group Name'] == group_name]

            # --- Left pane: Group summary ---
            dev_std = group_df['Norm Dev'].std()
            report_std = group_df['Norm Report'].std()
            total_var = dev_std + report_std

            dev_color = 'red' if dev_std > 0.2 else 'black'
            report_color = 'red' if report_std > 0.2 else 'black'
            total_color = 'red' if total_var > 0.4 else 'black'

            self.student_overview_text.insert(tk.END, f"Group: {group_name}\n")
            self.student_overview_text.insert(tk.END, f"  Dev Std=")
            self.student_overview_text.insert(tk.END, f"{dev_std:.2f}", dev_color)
            self.student_overview_text.insert(tk.END, ", Report Std=")
            self.student_overview_text.insert(tk.END, f"{report_std:.2f}", report_color)
            self.student_overview_text.insert(tk.END, ", Total Variance=")
            self.student_overview_text.insert(tk.END, f"{total_var:.2f}", total_color)
            self.student_overview_text.insert(tk.END, "\n\n")

            # --- Right pane: Student summary ---
            summary = group_df.groupby('Member Name')[['Norm Dev', 'Norm Report']].mean()
            summary['AvgTotal'] = summary[['Norm Dev', 'Norm Report']].mean(axis=1)
            summary = summary.sort_index()

            for student, row in summary.iterrows():
                dev_color = 'green' if row['Norm Dev'] > 1 else 'red' if row['Norm Dev'] < 0.75 else 'black'
                report_color = 'green' if row['Norm Report'] > 1 else 'red' if row['Norm Report'] < 0.75 else 'black'
                avg_color = 'green' if row['AvgTotal'] > 1 else 'red' if row['AvgTotal'] < 0.75 else 'black'

                self.student_overview_text.insert(tk.END, f"  {student}: Dev=")
                self.student_overview_text.insert(tk.END, f"{row['Norm Dev']:.2f}", dev_color)
                self.student_overview_text.insert(tk.END, ", Report=")
                self.student_overview_text.insert(tk.END, f"{row['Norm Report']:.2f}", report_color)
                self.student_overview_text.insert(tk.END, ", Avg=")
                self.student_overview_text.insert(tk.END, f"{row['AvgTotal']:.2f}", avg_color)
                self.student_overview_text.insert(tk.END, "\n")
            self.student_overview_text.insert(tk.END, "\n")

# ------------------------------
# Run the application
# ------------------------------
if __name__ == "__main__":
    app = RatingAnalyzer()
    app.mainloop()
