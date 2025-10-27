from flask import Flask, render_template

app = Flask(__name__)

@app.route('/')
def rating_page():
    # No groups to pass anymore; all is handled on the client via uploaded CSV
    return render_template('rating.html')


if __name__ == '__main__':
    app.run(debug=True)
