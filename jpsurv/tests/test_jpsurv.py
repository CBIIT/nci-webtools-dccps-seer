import unittest
from jpsurv import app

class BasicTests(unittest.TestCase):
    def setUp(self):
        # creates a test client
        self.app = app.test_client()

    def tearDown(self):
        pass

    def test_ping(self):
        # sends HTTP GET request to the application
        # on the specified path
        result = self.app.get("/ping")

        # assert the status code of the response
        self.assertEqual(result.status_code, 200)

    def test_home(self):
        result = self.app.get("/index.html")
        assert result.status_code ==  200


if __name__ == "__main__":
    unittest.main()
