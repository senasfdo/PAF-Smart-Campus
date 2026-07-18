import React from 'react';

const Footer = () => {
    return (
        <footer className="bg-gray-900 text-white pt-12 pb-8">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
                    <div className="col-span-1 md:col-span-1">
                        <div className="text-2xl font-bold flex items-center gap-1 mb-4">
                            <svg className="w-8 h-8 text-yellow-500" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                                <text x="12" y="16" fill="white" fontSize="10" fontWeight="bold" textAnchor="middle" fontFamily="sans-serif">SC</text>
                            </svg>
                            <span className="text-white">Smart<span className="text-yellow-500">Campus</span></span>
                        </div>
                        <p className="text-gray-400 text-sm">
                            Innovating your college experience with modern, integrated digital solutions.
                        </p>
                    </div>
                    
                    <div>
                        <h3 className="text-lg font-semibold mb-4 text-yellow-500">Quick Links</h3>
                        <ul className="space-y-2 text-gray-400 text-sm">
                            <li><a href="#" className="hover:text-yellow-500 transition">Home</a></li>
                            <li><a href="#about" className="hover:text-yellow-500 transition">About Us</a></li>
                            <li><a href="#facilities" className="hover:text-yellow-500 transition">Facilities</a></li>
                            <li><a href="#contact" className="hover:text-yellow-500 transition">Contact Us</a></li>
                        </ul>
                    </div>
                    
                    <div>
                        <h3 className="text-lg font-semibold mb-4 text-yellow-500">Resources</h3>
                        <ul className="space-y-2 text-gray-400 text-sm">
                            <li><a href="#" className="hover:text-yellow-500 transition">Student Portal</a></li>
                            <li><a href="#" className="hover:text-yellow-500 transition">Library</a></li>
                            <li><a href="#" className="hover:text-yellow-500 transition">Campus Map</a></li>
                            <li><a href="#" className="hover:text-yellow-500 transition">Help Center</a></li>
                        </ul>
                    </div>
                    
                    <div>
                        <h3 className="text-lg font-semibold mb-4 text-yellow-500">Contact</h3>
                        <ul className="space-y-2 text-gray-400 text-sm">
                            <li>Email: info@smartcampus.edu</li>
                            <li>Phone: +1 (555) 123-4567</li>
                            <li>Address: 100 University Ave, Campus City</li>
                        </ul>
                    </div>
                </div>
                
                <div className="border-t border-gray-800 pt-8 text-center text-gray-500 text-sm">
                    <p>&copy; {new Date().getFullYear()} Smart Campus Hub. All rights reserved.</p>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
