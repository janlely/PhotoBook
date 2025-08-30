import React from 'react';

const AboutPage: React.FC = () => {
  return (
    <div className="py-12 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h1 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
            About PhotoBook
          </h1>
          <p className="mt-4 text-lg text-gray-500">
            A modern photo gallery application built with React, TypeScript and Zustand.
          </p>
          <div className="mt-10">
            <div className="space-y-10 md:space-y-0 md:grid md:grid-cols-2 md:gap-x-8 md:gap-y-10">
              <div className="bg-gray-50 p-6 rounded-lg">
                <h2 className="text-xl font-bold text-gray-900">Our Mission</h2>
                <p className="mt-2 text-base text-gray-500">
                  To provide a beautiful and intuitive platform for organizing and sharing your photos.
                </p>
              </div>
              <div className="bg-gray-50 p-6 rounded-lg">
                <h2 className="text-xl font-bold text-gray-900">Technology Stack</h2>
                <p className="mt-2 text-base text-gray-500">
                  Built with Vite, React, TypeScript, Zustand, Tailwind CSS, and React Router.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AboutPage;
