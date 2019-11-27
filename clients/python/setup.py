import setuptools

with open("README.md", "r") as fh:
    long_description = fh.read()

setuptools.setup(
    name="testai-classifier-client",
    version="1.0.0",
    author="Jonathan Lipps",
    author_email="jlipps@cloudgrey.io",
    description="This is a client for the Test.ai classifier RPC server, which allows direct use of the classifier via a Python API and also provides a helper method for use with Selenium.",
    long_description=long_description,
    long_description_content_type="text/markdown",
    url="https://github.com/testdotai/appium-classifier-plugin",
    packages=setuptools.find_packages(),
    classifiers=[
        "Programming Language :: Python :: 3",
        "License :: OSI Approved :: APACHE-2.0 License",
        "Operating System :: OS Independent",
    ],
    python_requires='>=3.6',
)
