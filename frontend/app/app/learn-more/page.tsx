"use client"

import { Button } from "@/components/common/button";
import { useRouter } from "next/navigation";
import { Target, Eye, Warning, Lightbulb, Trophy, Heart } from "@phosphor-icons/react";

export default function LearnMore() {
  const router = useRouter();

  return (
    <div className="min-h-full font-sans">
      <div className="px-6 sm:px-8 py-8">
        {/* Hero Section */}
        <div className="mb-12">
          <div className="mb-6 text-center">
            <img 
              src="/studiosLogo.svg" 
              alt="Triber Studios Logo" 
              className="h-10 sm:h-12 lg:h-14 mx-auto"
            />
          </div>
          <p className="text-foreground leading-relaxed">
            Triber Studios is an immersive experience studio helping brands and artists build more engaged, lasting communities - which we call tribes - using immersive technologies. 
            <br /><br />
            <a href="https://blogs.nvidia.com/blog/what-is-extended-reality/" target="_blank" rel="noopener noreferrer" className="text-foreground underline hover:no-underline">Immersive technology</a> is a powerful new medium for sharing our stories, culture, and memory across boundaries, and we believe it should be accessible to all — We built Triberspace to accomplish this.
          </p>
        </div>


        {/* Challenge */}
        <div className="bg-sidebar rounded-xl p-8 border-3 border-sidebar mb-12">
          <h2 className="text-2xl font-semibold text-foreground mb-6 flex items-center gap-3">
            <Warning className="w-6 h-6" />
            Challenge
          </h2>
          <p className="text-foreground leading-relaxed">
            Immersive creation today falls into two extremes: either technical platforms like Unity that require coding and complicated development, or open but unstructured tools like Spatial or oncyber, where creators often lack direction — leading to empty or low-quality experiences. 
            <br /><br />
            Most creators want to build meaningful experiences that connect with their communities deeply, but don't have the tools or guidance to craft purpose-driven, curated immersive experiences that people truly want to join.
          </p>
        </div>

        {/* Action */}
        <div className="bg-sidebar rounded-xl p-8 border-3 border-sidebar mb-12">
          <h2 className="text-2xl font-semibold text-foreground mb-6 flex items-center gap-3">
            <Lightbulb className="w-6 h-6" />
            Action
          </h2>
          <p className="text-foreground leading-relaxed mb-6">
            We designed Triber Studios and our platform, Triberspace, as a curated ecosystem for helping creators build immersive art and entertainment experiences. Instead of leaving creators to figure it out alone, our tools and services:
          </p>
          <ul className="space-y-3">
            <li className="text-foreground flex items-start gap-3">
              <span className="text-foreground mt-2 w-1.5 h-1.5 rounded-full bg-sidebar-foreground shrink-0"></span>
              <span>Deliver innovation with simplicity</span>
            </li>
            <li className="text-foreground flex items-start gap-3">
              <span className="text-foreground mt-2 w-1.5 h-1.5 rounded-full bg-sidebar-foreground shrink-0"></span>
              <span>Provide curated experience types</span>
            </li>
            <li className="text-foreground flex items-start gap-3">
              <span className="text-foreground mt-2 w-1.5 h-1.5 rounded-full bg-sidebar-foreground shrink-0"></span>
              <span>Empower community-first design</span>
            </li>
            <li className="text-foreground flex items-start gap-3">
              <span className="text-foreground mt-2 w-1.5 h-1.5 rounded-full bg-sidebar-foreground shrink-0"></span>
              <span>Foster expression & access</span>
            </li>
          </ul>
        </div>

        {/* Result */}
        <div className="bg-sidebar rounded-xl p-8 border-3 border-sidebar mb-12">
          <h2 className="text-2xl font-semibold text-foreground mb-6 flex items-center gap-3">
            <Trophy className="w-6 h-6" />
            Result
          </h2>
          <p className="text-foreground leading-relaxed">
            The outcome is a platform where creators of all backgrounds can build immersive experiences people actually want to attend. Unlike competitors who either serve only developers or leave creation open-ended and chaotic, Triber makes it easy to build meaningful experiences.
          </p>
        </div>

        {/* Mission & Vision */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-12">
          <div className="bg-sidebar rounded-xl p-8 border-3 border-sidebar">
            <h2 className="text-2xl font-semibold text-foreground mb-4 flex items-center gap-3">
              <Target className="w-6 h-6" />
              Mission
            </h2>
            <p className="text-foreground leading-relaxed">
              Triber Studios exists to push forward the ultimate human technology - our stories. We build tools to help people create and share stories in the form of immersive experiences, transforming passive audiences into engaged tribes.
            </p>
          </div>
          <div className="bg-sidebar rounded-xl p-8 border-3 border-sidebar">
            <h2 className="text-2xl font-semibold text-foreground mb-4 flex items-center gap-3">
              <Eye className="w-6 h-6" />
              Vision
            </h2>
            <p className="text-foreground leading-relaxed">
              The Triber vision is to become the number one source for immersive art & entertainment experiences, empowering creators across the globe to share their work and gather their communities around them.
            </p>
          </div>
        </div>

        {/* Values */}
        <div className="bg-sidebar rounded-xl p-8 border-3 border-sidebar mb-12">
          <h2 className="text-2xl font-semibold text-foreground mb-8 flex items-center gap-3">
            <Heart className="w-6 h-6" />
            Our Values
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-background rounded-lg p-6 border border-border">
              <h3 className="text-lg font-medium text-foreground mb-3">Community</h3>
              <p className="text-foreground/80">We foster and drive community - The tribe is greater than the singular.</p>
            </div>
            <div className="bg-background rounded-lg p-6 border border-border">
              <h3 className="text-lg font-medium text-foreground mb-3">Expression</h3>
              <p className="text-foreground/80">We prioritize the human ability to create, express, and share stories.</p>
            </div>
            <div className="bg-background rounded-lg p-6 border border-border">
              <h3 className="text-lg font-medium text-foreground mb-3">Innovation</h3>
              <p className="text-foreground/80">We push boundaries and foster innovative thinking in everything we do.</p>
            </div>
            <div className="bg-background rounded-lg p-6 border border-border">
              <h3 className="text-lg font-medium text-foreground mb-3">Access</h3>
              <p className="text-foreground/80">We create space and opportunity for the under-recognized.</p>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="text-center py-12">
          <h2 className="text-2xl sm:text-3xl font-semibold text-foreground mb-8">
            Ready to Join Triberspace?
          </h2>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              className="h-12 px-8"
              onClick={() => router.push('/auth/sign-up')}
            >
              Get Started
            </Button>
            <Button 
              variant="secondary"
              className="h-12 px-8"
              onClick={() => router.push('/')}
            >
              Back to Home
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}