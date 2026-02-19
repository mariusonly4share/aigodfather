from setuptools import setup, find_packages

with open('README.md', 'r') as f:
    long_description = f.read()

setup(
    name='aigodfather',
    version='1.0.0',
    author='AIGodfather',
    author_email='support@aigodfather.ai',
    description='Official Python SDK for AIGodfather - AI Agent Monitoring',
    long_description=long_description,
    long_description_content_type='text/markdown',
    url='https://aigodfather.ai',
    project_urls={
        'Source': 'https://github.com/aigodfather/aigodfather-sdk',
        'Issues': 'https://github.com/aigodfather/aigodfather-sdk/issues'
    },
    packages=find_packages(),
    package_data={'aigodfather': ['py.typed']},
    install_requires=['requests>=2.28.0'],
    python_requires='>=3.8',
    license='MIT',
    keywords='ai monitoring agents aigodfather observability eu-ai-act',
    classifiers=[
        'Development Status :: 5 - Production/Stable',
        'Intended Audience :: Developers',
        'License :: OSI Approved :: MIT License',
        'Programming Language :: Python :: 3',
        'Programming Language :: Python :: 3.8',
        'Programming Language :: Python :: 3.9',
        'Programming Language :: Python :: 3.10',
        'Programming Language :: Python :: 3.11',
        'Programming Language :: Python :: 3.12',
    ]
)
