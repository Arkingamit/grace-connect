require 'xcodeproj'

project_path = 'App.xcodeproj'
project = Xcodeproj::Project.open(project_path)

# Find the App target
target = project.targets.find { |t| t.name == 'App' }

# Find the App group
app_group = project.main_group.find_subpath(File.join('App'), true)
app_group.set_source_tree('<group>')

# Check if the file is already in the project
file_ref = app_group.files.find { |f| f.path == 'GoogleService-Info.plist' }

if file_ref.nil?
  puts "Adding GoogleService-Info.plist to the group"
  file_ref = app_group.new_reference('GoogleService-Info.plist')
else
  puts "GoogleService-Info.plist already exists in the group"
end

# Check if it's already in the Resources build phase
resources_build_phase = target.resources_build_phase
if resources_build_phase.files_references.include?(file_ref)
  puts "GoogleService-Info.plist is already in the Resources build phase"
else
  puts "Adding GoogleService-Info.plist to the Resources build phase"
  build_file = resources_build_phase.add_file_reference(file_ref, true)
end

project.save
puts "Project saved successfully"
